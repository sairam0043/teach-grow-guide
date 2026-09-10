const mongoose = require('mongoose');
const { PAYOUT_STATUS } = require('../config/payments');

/**
 * One row per tutor per month. This collection is the ledger: it is the record
 * of what was owed, what was approved, and what was actually sent.
 *
 * It exists separately from `tutor.payoutHistory` (the manual disbursement log
 * the HR dashboard writes) because an embedded array cannot carry a uniqueness
 * constraint. Without one, re-running a month-end job silently pays everyone a
 * second time. The compound index at the bottom of this file is the single
 * thing that makes the job safe to retry.
 */

// A frozen snapshot of the bookings a payout was derived from. Stored so an
// amount can be explained months later even if the booking has since changed.
const payoutLineSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  studentName: { type: String },
  subject: { type: String },
  planType: { type: String },
  deliveredSessions: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  amountCollected: { type: Number, default: 0 },
  grossShare: { type: Number, default: 0 },
  deliveredAt: { type: Date },
}, { _id: false });

const payoutSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true, index: true },
  tutorName: { type: String },
  tutorEmail: { type: String },

  // Calendar month this payout covers, as "YYYY-MM". Half of the uniqueness key.
  period: { type: String, required: true, index: true },

  // --- money -------------------------------------------------------------
  grossAmount: { type: Number, required: true, default: 0 },

  // The rate actually applied, stored per record rather than read from config
  // at display time. If the split changes, historical payouts must still show
  // the terms that were in force when they were calculated.
  commissionRate: { type: Number, required: true },
  commissionAmount: { type: Number, required: true, default: 0 },

  // Reserved for TDS once Finance decides whether it is deducted at source.
  tdsAmount: { type: Number, default: 0 },

  // What actually transfers: gross - commission - tds.
  netAmount: { type: Number, required: true, default: 0 },

  // Earned but deliberately not paid: classes whose delivery is not confirmed.
  // Surfaced rather than dropped, so the gap is visible on the batch screen.
  unconfirmedAmount: { type: Number, default: 0 },

  sessionCount: { type: Number, default: 0 },
  lines: { type: [payoutLineSchema], default: [] },

  // --- lifecycle ---------------------------------------------------------
  status: {
    type: String,
    enum: Object.values(PAYOUT_STATUS),
    default: PAYOUT_STATUS.PENDING_APPROVAL,
    index: true,
  },
  holdReason: { type: String },

  approvedBy: { type: String },
  approvedAt: { type: Date },

  // --- settlement --------------------------------------------------------
  // Populated once a real transfer is wired up. Left empty by the generator.
  providerPayoutId: { type: String },
  providerReference: { type: String },
  utr: { type: String },
  failureReason: { type: String },
  paidAt: { type: Date },

  // Snapshot of where the money was sent, masked. Kept so a historical payout
  // still shows its destination after the tutor changes bank accounts.
  destinationSnapshot: {
    accountLast4: { type: String },
    ifsc: { type: String },
    accountHolderName: { type: String },
  },

  // Stable key derived from tutor + period. Passed to the payment provider as
  // its idempotency reference so a retried request cannot double-send.
  idempotencyKey: { type: String, required: true, unique: true },

  notes: { type: String },
}, { timestamps: true });

/**
 * The safety constraint. One payout per tutor per month, enforced by the
 * database rather than by application logic that a retry could skip.
 */
payoutSchema.index({ tutorId: 1, period: 1 }, { unique: true });

// Batch screens list a whole month at a time, filtered by state.
payoutSchema.index({ period: 1, status: 1 });

payoutSchema.statics.buildIdempotencyKey = function (tutorId, period) {
  return `payout_${tutorId}_${period}`;
};

const Payout = mongoose.model('Payout', payoutSchema);
module.exports = Payout;
