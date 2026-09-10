/**
 * Central configuration for tutor payouts.
 *
 * Every rate and threshold the payout system depends on lives here, so that
 * changing commercial terms is a one-line edit rather than a hunt through
 * route handlers. Values are read once at startup.
 */

// Share of the collected amount the platform retains, as a fraction.
// 0.10 = a 90/10 split in the tutor's favour, which is what the live system
// applies today in dashboardRoutes.js. Moving to 0.30 (a 70/30 split) is under
// discussion but not decided, so the default deliberately does not change
// current behaviour. Every Payout record stores the rate that was actually
// applied, so history stays accurate when this changes.
const PLATFORM_COMMISSION_RATE = clampRate(
  process.env.PLATFORM_COMMISSION_RATE,
  0.10
);

// Payouts below this are held rather than transferred, so that a tiny amount
// does not cost more in bank fees than it is worth. 0 disables the rule.
// The real figure is a Finance decision that has not been made yet.
const MINIMUM_PAYOUT_AMOUNT = Number(process.env.MINIMUM_PAYOUT_AMOUNT || 0);

/**
 * Whether a single (non-pack) booking still sitting in `enrolled` counts as
 * delivered once its scheduled time has passed.
 *
 * The existing admin report assumes it does. That is a known over-payment
 * route: the clock passing is not evidence the class happened. This ledger
 * therefore defaults to OFF and requires an explicit `completed` status, which
 * under-pays rather than over-pays when the two disagree. Anything held back
 * this way is reported as `unconfirmedAmount` so it is visible, not silently
 * dropped.
 */
const COUNT_PAST_ENROLLED_AS_DELIVERED =
  String(process.env.COUNT_PAST_ENROLLED_AS_DELIVERED || 'false') === 'true';

function clampRate(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n >= 1) return fallback;
  return n;
}

// Money is stored in rupees. Round to paise so repeated arithmetic cannot
// drift, and so the sum of the parts always equals the whole.
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const fromPaise = (paise) => Number((paise / 100).toFixed(2));

/**
 * Split a collected amount between platform and tutor.
 * Works in paise and derives the tutor's share by subtraction so the two
 * halves always add back up to the original.
 */
function splitAmount(grossRupees, rate = PLATFORM_COMMISSION_RATE) {
  const grossPaise = toPaise(grossRupees);
  const commissionPaise = Math.round(grossPaise * rate);
  const netPaise = grossPaise - commissionPaise;
  return {
    gross: fromPaise(grossPaise),
    commission: fromPaise(commissionPaise),
    net: fromPaise(netPaise),
    rate,
  };
}

// Lifecycle of a tutor's payout profile (their bank + tax details).
const PROFILE_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFICATION_FAILED: 'verification_failed',
  PENDING_APPROVAL: 'pending_approval',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

// Lifecycle of a single monthly payment to one tutor.
const PAYOUT_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
};

// Validation. Kept here so the same rules apply on every entry point.
const PATTERNS = {
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  accountNumber: /^\d{9,18}$/,
  vpa: /^[\w.\-]{3,50}@[a-zA-Z]{3,}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,
  period: /^\d{4}-(0[1-9]|1[0-2])$/, // "2026-08"
};

module.exports = {
  PLATFORM_COMMISSION_RATE,
  MINIMUM_PAYOUT_AMOUNT,
  COUNT_PAST_ENROLLED_AS_DELIVERED,
  PROFILE_STATUS,
  PAYOUT_STATUS,
  PATTERNS,
  splitAmount,
  toPaise,
  fromPaise,
};
