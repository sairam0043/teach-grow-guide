/**
 * Tutor payout endpoints.
 *
 * SECURITY NOTE - these routes are UNPROTECTED, in common with every other
 * route in this backend (no jwt.verify exists anywhere; ProtectedRoute is a
 * client-side gate only). They read and write bank details and approve money.
 * Every handler below is annotated with the role it assumes. See
 * PAYOUTS_AUTH_TODO.md for what must be locked down before real traffic.
 */
const express = require('express');
const mongoose = require('mongoose');

const Tutor = require('../schemas/tutorSchema');
const Payout = require('../schemas/payoutSchema');
const { calculatePayoutsForPeriod, assertPeriod } = require('../utils/payoutCalculator');
const fieldCrypto = require('../utils/fieldCrypto');
const {
  PATTERNS,
  PROFILE_STATUS,
  PAYOUT_STATUS,
  PLATFORM_COMMISSION_RATE,
  MINIMUM_PAYOUT_AMOUNT,
} = require('../config/payments');

const router = express.Router();

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const clean = (v) => String(v ?? '').trim();
const DOT = '•';

/** Never return the ciphertext or the account number itself. */
function publicProfile(tutor) {
  const p = tutor.payoutProfile || {};
  return {
    legalName: p.legalName || '',
    pan: p.pan || '',
    dateOfBirth: p.dateOfBirth || null,
    gstin: p.gstin || '',
    accountHolderName: p.accountHolderName || '',
    accountLast4: p.accountLast4 || '',
    accountMasked: p.accountLast4 ? DOT.repeat(6) + p.accountLast4 : '',
    ifsc: p.ifsc || '',
    accountType: p.accountType || 'savings',
    vpa: p.vpa || '',
    status: p.status || PROFILE_STATUS.NOT_SUBMITTED,
    verifiedNameAtBank: p.verifiedNameAtBank || '',
    verificationFailureReason: p.verificationFailureReason || '',
    rejectionReason: p.rejectionReason || '',
    termsAcceptedAt: p.termsAcceptedAt || null,
    termsAcceptedRate: p.termsAcceptedRate ?? null,
    submittedAt: p.submittedAt || null,
    updatedAt: p.updatedAt || null,
  };
}

/** Field-level validation. Returns human-readable problems, not codes. */
function validateProfile(body) {
  const errors = [];
  const pan = clean(body.pan).toUpperCase();
  const ifsc = clean(body.ifsc).toUpperCase();
  const account = clean(body.accountNumber).replace(/\s/g, '');
  const confirm = clean(body.confirmAccountNumber).replace(/\s/g, '');
  const gstin = clean(body.gstin).toUpperCase();
  const vpa = clean(body.vpa).toLowerCase();

  if (clean(body.legalName).length < 3) errors.push('Legal name must be at least 3 characters.');
  if (!PATTERNS.pan.test(pan)) errors.push('PAN must look like ABCDE1234F.');
  if (clean(body.accountHolderName).length < 3) errors.push('Account holder name is required.');
  if (!PATTERNS.accountNumber.test(account)) errors.push('Account number must be 9 to 18 digits.');
  if (account !== confirm) errors.push('Account numbers do not match.');
  if (!PATTERNS.ifsc.test(ifsc)) errors.push('IFSC must look like HDFC0001234 - the 5th character is a zero.');
  if (!['savings', 'current'].includes(clean(body.accountType))) errors.push('Account type must be savings or current.');
  if (gstin && !PATTERNS.gstin.test(gstin)) errors.push('GSTIN is not in a valid format.');
  if (vpa && !PATTERNS.vpa.test(vpa)) errors.push('UPI ID is not in a valid format.');
  if (!body.acceptTerms) errors.push('The payout terms must be accepted.');

  return { errors, normalised: { pan, ifsc, account, gstin, vpa } };
}

function totalsOf(rows) {
  const t = { gross: 0, commission: 0, net: 0, unconfirmed: 0, sessions: 0, onHold: 0 };
  for (const r of rows) {
    t.gross += r.grossAmount || 0;
    t.commission += r.commissionAmount || 0;
    t.net += r.netAmount || 0;
    t.unconfirmed += r.unconfirmedAmount || 0;
    t.sessions += r.sessionCount || 0;
    if (r.status === PAYOUT_STATUS.ON_HOLD) t.onHold += r.netAmount || 0;
  }
  for (const k of ['gross', 'commission', 'net', 'unconfirmed', 'onHold']) {
    t[k] = Number(t[k].toFixed(2));
  }
  return t;
}

/* ---------------------------------------------------------------------------
 * Tutor-facing
 * ------------------------------------------------------------------------ */

// GET /api/payouts/tutor/:tutorId/profile      [assumes: the tutor, or staff]
router.get('/tutor/:tutorId/profile', async (req, res) => {
  try {
    const { tutorId } = req.params;
    if (!isId(tutorId)) return res.status(400).json({ message: 'Invalid tutor id' });
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    res.json({ profile: publicProfile(tutor), commissionRate: PLATFORM_COMMISSION_RATE });
  } catch (err) {
    res.status(500).json({ message: 'Could not load payout profile', error: err.message });
  }
});

// POST /api/payouts/tutor/:tutorId/profile     [assumes: the tutor themself]
router.post('/tutor/:tutorId/profile', async (req, res) => {
  try {
    const { tutorId } = req.params;
    if (!isId(tutorId)) return res.status(400).json({ message: 'Invalid tutor id' });

    if (!fieldCrypto.isConfigured()) {
      // Refuse rather than storing an account number in the clear.
      return res.status(503).json({
        message: 'Payout details cannot be accepted: the server encryption key is not configured.',
      });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    const current = tutor.payoutProfile || {};
    if (current.status === PROFILE_STATUS.VERIFIED && !req.body.confirmReplace) {
      // Changing a verified account is the classic payday-fraud route, so it
      // takes an explicit second confirmation and drops back to re-approval.
      return res.status(409).json({
        message: 'These details are already verified. Replacing them needs confirmation and re-approval.',
        requiresConfirmation: true,
      });
    }

    const { errors, normalised } = validateProfile(req.body);
    if (errors.length) {
      return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    }

    tutor.payoutProfile = {
      ...current,
      legalName: clean(req.body.legalName),
      pan: normalised.pan,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : current.dateOfBirth,
      gstin: normalised.gstin,
      accountHolderName: clean(req.body.accountHolderName),
      accountNumberEnc: fieldCrypto.encrypt(normalised.account),
      accountLast4: normalised.account.slice(-4),
      ifsc: normalised.ifsc,
      accountType: clean(req.body.accountType),
      vpa: normalised.vpa,
      bankProofId: isId(req.body.bankProofId) ? req.body.bankProofId : current.bankProofId,
      panProofId: isId(req.body.panProofId) ? req.body.panProofId : current.panProofId,
      // Submitting always re-enters verification, even from verified.
      status: PROFILE_STATUS.PENDING_VERIFICATION,
      verifiedNameAtBank: '',
      verificationFailureReason: '',
      rejectionReason: '',
      approvedBy: '',
      approvedAt: null,
      termsAcceptedAt: new Date(),
      termsAcceptedRate: PLATFORM_COMMISSION_RATE,
      termsVersion: clean(req.body.termsVersion) || '2026-08',
      submittedAt: current.submittedAt || new Date(),
      updatedAt: new Date(),
    };

    await tutor.save();
    res.json({
      message: 'Payout details saved. They are verified before any payment is made.',
      profile: publicProfile(tutor),
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not save payout details', error: err.message });
  }
});

// GET /api/payouts/tutor/:tutorId/history                [assumes: the tutor]
router.get('/tutor/:tutorId/history', async (req, res) => {
  try {
    const { tutorId } = req.params;
    if (!isId(tutorId)) return res.status(400).json({ message: 'Invalid tutor id' });
    const payouts = await Payout.find({ tutorId })
      .sort({ period: -1 })
      .select('-lines')
      .lean();
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ message: 'Could not load payout history', error: err.message });
  }
});

/* ---------------------------------------------------------------------------
 * Staff-facing
 * ------------------------------------------------------------------------ */

// POST /api/payouts/staff/profile/:tutorId/verification-result   [staff]
// Records the outcome of a penny-drop check. The provider call is not wired
// yet, so the result is supplied by the caller.
router.post('/staff/profile/:tutorId/verification-result', async (req, res) => {
  try {
    const { tutorId } = req.params;
    if (!isId(tutorId)) return res.status(400).json({ message: 'Invalid tutor id' });
    const tutor = await Tutor.findById(tutorId);
    if (!tutor || !tutor.payoutProfile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    tutor.payoutProfile.verificationAttemptedAt = new Date();

    if (req.body.succeeded) {
      tutor.payoutProfile.verifiedNameAtBank = clean(req.body.nameAtBank);
      tutor.payoutProfile.verificationFailureReason = '';
      // Never auto-approve on a name match. Bank name formats vary too much
      // (RAJESH KUMAR S vs S Rajesh Kumar), so a person decides.
      tutor.payoutProfile.status = PROFILE_STATUS.PENDING_APPROVAL;
    } else {
      tutor.payoutProfile.verificationFailureReason =
        clean(req.body.reason) || 'The bank rejected the test transfer.';
      tutor.payoutProfile.status = PROFILE_STATUS.VERIFICATION_FAILED;
    }

    tutor.payoutProfile.updatedAt = new Date();
    await tutor.save();
    res.json({ profile: publicProfile(tutor) });
  } catch (err) {
    res.status(500).json({ message: 'Could not record verification result', error: err.message });
  }
});

// POST /api/payouts/staff/profile/:tutorId/decision              [staff]
router.post('/staff/profile/:tutorId/decision', async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { approve, reason, decidedBy } = req.body;
    if (!isId(tutorId)) return res.status(400).json({ message: 'Invalid tutor id' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor || !tutor.payoutProfile) {
      return res.status(404).json({ message: 'Payout profile not found' });
    }

    if (approve) {
      tutor.payoutProfile.status = PROFILE_STATUS.VERIFIED;
      tutor.payoutProfile.approvedBy = clean(decidedBy) || 'staff';
      tutor.payoutProfile.approvedAt = new Date();
      tutor.payoutProfile.rejectionReason = '';
    } else {
      if (!clean(reason)) return res.status(400).json({ message: 'A rejection reason is required.' });
      tutor.payoutProfile.status = PROFILE_STATUS.REJECTED;
      tutor.payoutProfile.rejectionReason = clean(reason);
    }

    tutor.payoutProfile.updatedAt = new Date();
    await tutor.save();
    res.json({ profile: publicProfile(tutor) });
  } catch (err) {
    res.status(500).json({ message: 'Could not record decision', error: err.message });
  }
});

// GET /api/payouts/staff/preview/:period                         [staff]
// Calculates without writing anything. Safe to call repeatedly.
router.get('/staff/preview/:period', async (req, res) => {
  try {
    assertPeriod(req.params.period);
    const rows = await calculatePayoutsForPeriod(req.params.period);
    res.json({
      period: req.params.period,
      commissionRate: PLATFORM_COMMISSION_RATE,
      count: rows.length,
      totals: totalsOf(rows),
      rows,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/payouts/staff/generate/:period                       [staff]
// Creates the ledger rows for a month. Idempotent: re-running refreshes rows
// still awaiting approval and leaves anything approved, paid or cancelled
// untouched.
router.post('/staff/generate/:period', async (req, res) => {
  try {
    const { period } = req.params;
    assertPeriod(period);

    const rows = await calculatePayoutsForPeriod(period);
    let created = 0;
    let refreshed = 0;
    const skipped = [];

    for (const row of rows) {
      const existing = await Payout.findOne({ tutorId: row.tutorId, period });

      // Anything past approval is settled history and must not be recomputed.
      if (existing && existing.status !== PAYOUT_STATUS.PENDING_APPROVAL &&
          existing.status !== PAYOUT_STATUS.ON_HOLD) {
        skipped.push({ tutorName: row.tutorName, status: existing.status });
        continue;
      }

      const held = !row.payable
        ? 'Payout details are not verified'
        : (MINIMUM_PAYOUT_AMOUNT > 0 && row.netAmount < MINIMUM_PAYOUT_AMOUNT)
          ? 'Below the minimum payout amount'
          : '';

      const doc = {
        tutorId: row.tutorId,
        tutorName: row.tutorName,
        tutorEmail: row.tutorEmail,
        period,
        grossAmount: row.grossAmount,
        commissionRate: row.commissionRate,
        commissionAmount: row.commissionAmount,
        tdsAmount: 0,
        netAmount: row.netAmount,
        unconfirmedAmount: row.unconfirmedAmount,
        sessionCount: row.sessionCount,
        lines: row.lines,
        destinationSnapshot: row.destinationSnapshot,
        status: held ? PAYOUT_STATUS.ON_HOLD : PAYOUT_STATUS.PENDING_APPROVAL,
        holdReason: held,
        idempotencyKey: Payout.buildIdempotencyKey(row.tutorId, period),
      };

      if (existing) {
        Object.assign(existing, doc);
        await existing.save();
        refreshed += 1;
      } else {
        // upsert rather than create, so two concurrent runs cannot both insert
        await Payout.findOneAndUpdate(
          { tutorId: row.tutorId, period },
          { $setOnInsert: doc },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        created += 1;
      }
    }

    const batch = await Payout.find({ period }).sort({ netAmount: -1 }).select('-lines').lean();
    res.json({ period, created, refreshed, skipped, totals: totalsOf(batch), batch });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/payouts/staff/batch/:period                           [staff]
router.get('/staff/batch/:period', async (req, res) => {
  try {
    assertPeriod(req.params.period);
    const batch = await Payout.find({ period: req.params.period }).sort({ netAmount: -1 }).lean();
    res.json({
      period: req.params.period,
      count: batch.length,
      totals: totalsOf(batch),
      batch,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/payouts/staff/batch/:period/approve                  [staff]
// The point at which a person releases the month. Only moves rows actually
// awaiting approval; held and settled rows are left alone.
router.post('/staff/batch/:period/approve', async (req, res) => {
  try {
    const { period } = req.params;
    assertPeriod(period);
    const approvedBy = clean(req.body.approvedBy) || 'staff';

    const result = await Payout.updateMany(
      { period, status: PAYOUT_STATUS.PENDING_APPROVAL },
      { $set: { status: PAYOUT_STATUS.APPROVED, approvedBy, approvedAt: new Date() } }
    );

    const batch = await Payout.find({ period }).sort({ netAmount: -1 }).select('-lines').lean();
    res.json({
      period,
      approved: result.modifiedCount ?? 0,
      message: 'Approved. No transfer is sent yet - the payment provider is not connected.',
      totals: totalsOf(batch),
      batch,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/payouts/staff/payout/:id/status                      [staff]
router.post('/staff/payout/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid payout id' });
    if (!Object.values(PAYOUT_STATUS).includes(status)) {
      return res.status(400).json({ message: 'Unknown payout status' });
    }
    const payout = await Payout.findById(id);
    if (!payout) return res.status(404).json({ message: 'Payout not found' });

    payout.status = status;
    if (status === PAYOUT_STATUS.ON_HOLD) payout.holdReason = clean(reason);
    if (status === PAYOUT_STATUS.FAILED) payout.failureReason = clean(reason);
    if (status === PAYOUT_STATUS.PAID) payout.paidAt = new Date();
    await payout.save();
    res.json(payout);
  } catch (err) {
    res.status(500).json({ message: 'Could not update payout', error: err.message });
  }
});

module.exports = router;
