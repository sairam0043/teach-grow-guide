/**
 * The business logic layer over Razorpay Route.
 *
 * `razorpayRoute.js` is the thin API client. This is where the rules live:
 * who gets onboarded, how a payment is split, and when a held transfer is
 * released. Route being disabled is handled at the bottom of the stack, so
 * everything here reads the same whether it is live or dark.
 */
const Tutor = require('../schemas/tutorSchema');
const User = require('../schemas/userSchema');
const route = require('./razorpayRoute');
const fieldCrypto = require('./fieldCrypto');
const { splitAmount, isRouteTutor, toPaise, fromPaise } = require('../config/payments');

/**
 * Create the tutor's linked account at Razorpay.
 *
 * Called once their payout details are approved. Idempotent: a tutor who
 * already has an account id is returned unchanged rather than duplicated.
 */
async function onboardTutorToRoute(tutorId) {
  const tutor = await Tutor.findById(tutorId).select('+payoutProfile.accountNumberEnc');
  if (!tutor) throw new Error('Tutor not found');

  const profile = tutor.payoutProfile || {};

  if (profile.routeAccountId) {
    return { alreadyOnboarded: true, accountId: profile.routeAccountId, status: profile.routeStatus };
  }
  if (profile.status !== 'verified') {
    throw new Error('Payout details must be verified before onboarding to Route.');
  }

  const user = await User.findById(tutor.userId).select('email phone').lean();
  if (!user?.email) throw new Error('Tutor has no email address on file.');
  if (!user?.phone) {
    // Razorpay requires a contact number on a linked account.
    throw new Error('Tutor has no phone number on file, which Razorpay requires.');
  }

  // Decrypted only for this call and never held beyond it.
  let accountNumber = '';
  try {
    accountNumber = fieldCrypto.decrypt(profile.accountNumberEnc);
  } catch {
    throw new Error('Stored bank account could not be read. Ask the tutor to re-enter it.');
  }

  try {
    const result = await route.onboardTutor(tutor, user, accountNumber);

    tutor.payoutProfile.routeAccountId = result.accountId;
    tutor.payoutProfile.routeStakeholderId = result.stakeholderId;
    tutor.payoutProfile.routeProductConfigId = result.productConfigId;
    tutor.payoutProfile.routeStatus = result.simulated ? 'requested' : (result.status || 'requested');
    tutor.payoutProfile.routeOnboardedAt = new Date();
    tutor.payoutProfile.routeLastError = '';
    await tutor.save();

    return { alreadyOnboarded: false, simulated: Boolean(result.simulated), ...result };
  } catch (err) {
    const reason = route.describeError(err);
    tutor.payoutProfile.routeStatus = 'failed';
    tutor.payoutProfile.routeLastError = reason;
    await tutor.save();
    throw new Error(reason);
  }
}

/**
 * Split a paid booking, holding the tutor's share.
 *
 * One transfer per class. Route's on_hold is all-or-nothing per transfer, so a
 * twelve-class pack needs twelve held transfers if each is to be released as it
 * is taught. Amounts are derived from paise and the last class absorbs the
 * remainder, so the parts always add back to the tutor's exact share.
 *
 * Returns null when Route is not in play for this tutor, in which case the
 * caller carries on exactly as before.
 */
async function splitBookingPayment(booking, paymentId) {
  if (!isRouteTutor(booking.tutorId)) return null;
  if (!paymentId) return null;

  // Already split: never transfer twice for one payment.
  if (Array.isArray(booking.routeTransfers) && booking.routeTransfers.length > 0) {
    return { alreadySplit: true, count: booking.routeTransfers.length };
  }

  const tutor = await Tutor.findById(booking.tutorId).select('payoutProfile').lean();
  const accountId = tutor?.payoutProfile?.routeAccountId;
  if (!accountId) return null;                    // not onboarded yet

  const collected = Number(booking.amountPaid || 0);
  if (collected <= 0) return null;                // free demo

  const { net } = splitAmount(collected);         // the tutor's share
  const sessions = Array.isArray(booking.sessions) ? booking.sessions : [];
  const count = sessions.length > 0 ? sessions.length : 1;

  // Divide in paise and give the remainder to the last class.
  const netPaise = toPaise(net);
  const per = Math.floor(netPaise / count);
  const amounts = Array.from({ length: count }, (_, i) =>
    fromPaise(i === count - 1 ? netPaise - per * (count - 1) : per));

  const created = [];
  for (let i = 0; i < count; i++) {
    if (amounts[i] <= 0) continue;
    try {
      const transfer = await route.createHeldTransfer(paymentId, accountId, amounts[i], {
        bookingId: String(booking._id),
        tutorId: String(booking.tutorId),
        sessionIndex: sessions.length > 0 ? String(i) : 'single',
        subject: booking.subject || '',
      });
      if (!transfer) continue;
      created.push({
        transferId: transfer.id,
        sessionIndex: sessions.length > 0 ? i : null,
        amount: amounts[i],
        status: 'held',
        createdAt: new Date(),
      });
    } catch (err) {
      // One failed split must not lose the enrolment. Record and move on;
      // the batch screen shows the shortfall and it can be retried.
      created.push({
        transferId: `failed_${Date.now()}_${i}`,
        sessionIndex: sessions.length > 0 ? i : null,
        amount: amounts[i],
        status: 'failed',
        failureReason: route.describeError(err),
        createdAt: new Date(),
      });
    }
  }

  booking.routeTransfers = created;
  await booking.save();

  return {
    alreadySplit: false,
    count: created.length,
    held: created.filter((t) => t.status === 'held').length,
    failed: created.filter((t) => t.status === 'failed').length,
    totalHeld: created.filter((t) => t.status === 'held').reduce((a, t) => a + t.amount, 0),
  };
}

/**
 * Release the held transfers for every class delivered in a period.
 *
 * Called when a month's batch is approved. Only classes actually marked
 * completed are released; anything unconfirmed stays held, which is the same
 * rule the ledger uses when it decides what is payable.
 */
async function releaseTransfersForPayout(payout, Booking) {
  const released = [];
  const failures = [];

  const bookingIds = (payout.lines || []).map((l) => l.bookingId).filter(Boolean);
  if (bookingIds.length === 0) return { released, failures };

  const bookings = await Booking.find({ _id: { $in: bookingIds } });

  for (const booking of bookings) {
    const transfers = booking.routeTransfers || [];
    if (transfers.length === 0) continue;

    let touched = false;
    for (const t of transfers) {
      if (t.status !== 'held') continue;

      // A pack class is released only if that class was delivered.
      if (t.sessionIndex !== null && t.sessionIndex !== undefined) {
        const session = (booking.sessions || [])[t.sessionIndex];
        if (!session || session.status !== 'completed') continue;
      } else if (booking.status !== 'completed') {
        continue;
      }

      try {
        await route.releaseTransfer(t.transferId);
        t.status = 'released';
        t.releasedAt = new Date();
        released.push({ transferId: t.transferId, amount: t.amount });
        touched = true;
      } catch (err) {
        t.failureReason = route.describeError(err);
        failures.push({ transferId: t.transferId, reason: t.failureReason });
        touched = true;
      }
    }
    if (touched) await booking.save();
  }

  return { released, failures };
}

/** Claw back held transfers for a booking, e.g. when a student is refunded. */
async function reverseBookingTransfers(booking) {
  const reversed = [];
  for (const t of booking.routeTransfers || []) {
    if (!['held', 'released'].includes(t.status)) continue;
    try {
      await route.reverseTransfer(t.transferId);
      t.status = 'reversed';
      reversed.push(t.transferId);
    } catch (err) {
      t.failureReason = route.describeError(err);
    }
  }
  if (reversed.length) await booking.save();
  return reversed;
}

module.exports = {
  onboardTutorToRoute,
  splitBookingPayment,
  releaseTransfersForPayout,
  reverseBookingTransfers,
};
