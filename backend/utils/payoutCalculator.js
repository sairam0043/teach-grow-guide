/**
 * Works out what each tutor earned in a given calendar month.
 *
 * Kept separate from the admin report in dashboardRoutes.js on purpose. That
 * report is all-time and grouped by pricing period; this is scoped to one
 * month and is the input to money actually moving, so it is deliberately more
 * conservative about what counts as delivered.
 */
const Booking = require('../schemas/bookingSchema');
const Tutor = require('../schemas/tutorSchema');
const {
  splitAmount,
  PLATFORM_COMMISSION_RATE,
  COUNT_PAST_ENROLLED_AS_DELIVERED,
  PATTERNS,
  fromPaise,
  toPaise,
} = require('../config/payments');

/**
 * Bookings carry their date in several shapes depending on how old they are:
 * a real Date in utcTiming, a human string in timing ("August 9, 2026 at
 * 10:00 AM"), or neither. Try them in order of trustworthiness and fall back
 * to createdAt so a booking is never silently excluded from every month.
 */
function resolveDate(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    if (c instanceof Date && !isNaN(c)) return c;
    const parsed = new Date(String(c).replace(' at ', ' '));
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

/** "2026-08" for a Date, in the same local frame the rest of the app uses. */
function toPeriod(date) {
  if (!date || isNaN(date)) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function assertPeriod(period) {
  if (!PATTERNS.period.test(String(period || ''))) {
    throw new Error(`Invalid period "${period}". Expected YYYY-MM, e.g. 2026-08.`);
  }
}

/**
 * Reduce one booking to what it contributes to a period.
 *
 * Returns the amount whose delivery is confirmed, plus separately the amount
 * that looks earned but is not confirmed. The second figure is reported rather
 * than paid, so the difference is visible instead of quietly vanishing.
 */
function evaluateBooking(booking, period) {
  const result = {
    delivered: 0, unconfirmed: 0, sessions: 0,
    totalSessions: 0, deliveredAt: null,
  };

  // Only money that was actually collected can be shared out.
  const collected = Number(booking.amountPaid || 0);
  if (collected <= 0) return result;           // free demos contribute nothing
  if (!['enrolled', 'completed'].includes(booking.status)) return result;

  const sessions = Array.isArray(booking.sessions) ? booking.sessions : [];

  if (sessions.length > 0) {
    // Monthly pack: value is spread evenly across its classes and each class
    // is counted in the month it was actually taught.
    //
    // Counts are tallied first and money derived from them at the end. Adding
    // up a per-session amount that has already been rounded loses a paisa on
    // amounts that do not divide evenly -- 1000 over 3 sessions returns 999.99
    // -- which would leave every such payout a fraction short.
    result.totalSessions = sessions.length;
    const totalPaise = toPaise(collected);
    let deliveredCount = 0;
    let unconfirmedCount = 0;

    for (const s of sessions) {
      const when = resolveDate(s.utcDate, s.date && `${s.date} ${s.time || ''}`.trim());
      if (toPeriod(when) !== period) continue;

      if (s.status === 'completed') {
        deliveredCount += 1;
        if (!result.deliveredAt || when > result.deliveredAt) result.deliveredAt = when;
      } else if (s.status === 'scheduled' && when && when < new Date()) {
        // Past its slot but never marked either way.
        unconfirmedCount += 1;
      }
    }

    const share = (count) =>
      fromPaise(Math.round((totalPaise * count) / sessions.length));

    result.delivered = share(deliveredCount);
    result.unconfirmed = share(unconfirmedCount);
    result.sessions = deliveredCount;
    return result;
  }

  // Single class.
  const when = resolveDate(booking.utcTiming, booking.timing, booking.createdAt);
  if (toPeriod(when) !== period) return result;

  result.totalSessions = 1;
  result.deliveredAt = when;

  if (booking.status === 'completed') {
    result.delivered = collected;
    result.sessions = 1;
  } else if (booking.status === 'enrolled') {
    // Paid and the slot has passed, but nobody confirmed it happened. The
    // existing report treats this as delivered; this ledger does not, because
    // a clock passing is not evidence a class took place. Configurable, and
    // reported either way.
    const isPast = when && when.getTime() < Date.now();
    if (isPast && COUNT_PAST_ENROLLED_AS_DELIVERED) {
      result.delivered = collected;
      result.sessions = 1;
    } else if (isPast) {
      result.unconfirmed = collected;
    }
  }

  return result;
}

/**
 * Build the payout figures for every tutor for one month.
 * Pure calculation: reads only, writes nothing.
 */
async function calculatePayoutsForPeriod(period, options = {}) {
  assertPeriod(period);
  const rate = options.commissionRate ?? PLATFORM_COMMISSION_RATE;

  // One bulk read, grouped in memory. Querying per tutor is what made the
  // existing report take 8.4 seconds against a 10-second serverless limit.
  const [tutors, bookings] = await Promise.all([
    Tutor.find().populate('userId', 'email full_name phone').lean(),
    Booking.find({ status: { $in: ['enrolled', 'completed'] } }).lean(),
  ]);

  const byTutor = new Map();
  for (const b of bookings) {
    if (!b.tutorId) continue;
    const id = String(b.tutorId._id || b.tutorId);
    if (!byTutor.has(id)) byTutor.set(id, []);
    byTutor.get(id).push(b);
  }

  const rows = [];
  for (const tutor of tutors) {
    const list = byTutor.get(String(tutor._id)) || [];

    let grossPaise = 0;
    let unconfirmedPaise = 0;
    let sessionCount = 0;
    const lines = [];

    for (const booking of list) {
      const ev = evaluateBooking(booking, period);
      if (ev.delivered <= 0 && ev.unconfirmed <= 0) continue;

      grossPaise += toPaise(ev.delivered);
      unconfirmedPaise += toPaise(ev.unconfirmed);
      sessionCount += ev.sessions;

      lines.push({
        bookingId: booking._id,
        studentName: booking.studentName,
        subject: booking.subject,
        planType: booking.planType,
        deliveredSessions: ev.sessions,
        totalSessions: ev.totalSessions,
        amountCollected: Number(booking.amountPaid || 0),
        grossShare: ev.delivered,
        deliveredAt: ev.deliveredAt,
      });
    }

    if (grossPaise <= 0 && unconfirmedPaise <= 0) continue;   // nothing to report

    const split = splitAmount(fromPaise(grossPaise), rate);
    const profile = tutor.payoutProfile || {};

    rows.push({
      tutorId: tutor._id,
      tutorName: tutor.name,
      tutorEmail: tutor.userId?.email || '',
      period,
      grossAmount: split.gross,
      commissionRate: split.rate,
      commissionAmount: split.commission,
      tdsAmount: 0,
      netAmount: split.net,
      unconfirmedAmount: fromPaise(unconfirmedPaise),
      sessionCount,
      lines,
      profileStatus: profile.status || 'not_submitted',
      payable: profile.status === 'verified',
      destinationSnapshot: {
        accountLast4: profile.accountLast4 || '',
        ifsc: profile.ifsc || '',
        accountHolderName: profile.accountHolderName || '',
      },
    });
  }

  rows.sort((a, b) => b.netAmount - a.netAmount);
  return rows;
}

module.exports = {
  calculatePayoutsForPeriod,
  evaluateBooking,
  resolveDate,
  toPeriod,
  assertPeriod,
};
