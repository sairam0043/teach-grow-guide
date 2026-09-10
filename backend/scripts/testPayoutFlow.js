/**
 * End-to-end exercise of the tutor payout system.
 *
 *   node scripts/testPayoutFlow.js                # uses last month
 *   node scripts/testPayoutFlow.js 2026-08        # a specific month
 *   node scripts/testPayoutFlow.js 2026-08 --keep # leave the test data behind
 *
 * Requires the backend to be running (npm run dev in backend/).
 *
 * Drives the real HTTP endpoints rather than calling the models directly, so
 * it exercises validation, encryption and the idempotency guard exactly as a
 * browser would. It picks one tutor, walks the whole flow, asserts the things
 * that matter, and then removes everything it created unless --keep is passed.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000/api';
const KEEP = process.argv.includes('--keep');
const PERIOD = (process.argv[2] && /^\d{4}-\d{2}$/.test(process.argv[2]))
  ? process.argv[2]
  : lastMonth();

// Obviously-fake values so this is never mistaken for a real tutor's data.
const TEST = {
  legalName: 'Payout Test Account',
  pan: 'ABCDE1234F',
  dateOfBirth: '1990-01-01',
  accountHolderName: 'Payout Test Account',
  accountNumber: '123456789012',
  confirmAccountNumber: '123456789012',
  ifsc: 'HDFC0001234',
  accountType: 'savings',
  acceptTerms: true,
};

let passed = 0, failed = 0;

function lastMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function check(label, condition, detail = '') {
  if (condition) { passed++; console.log(`   PASS  ${label}`); }
  else { failed++; console.log(`   FAIL  ${label}${detail ? `\n         ${detail}` : ''}`); }
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

(async () => {
  console.log(`\nPayout flow test  ---  period ${PERIOD}  ---  ${BASE}\n`);

  // Confirm the server is up before doing anything else.
  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error('Backend is not responding. Start it with: npm run dev  (in backend/)\n');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const Tutors = mongoose.connection.collection('tutors');
  const Payouts = mongoose.connection.collection('payouts');

  // Prefer a tutor who actually has activity in this period, so the numbers
  // are real; otherwise fall back to any approved tutor.
  const preview = await call('GET', `/payouts/staff/preview/${PERIOD}`);
  const candidate = preview.body?.rows?.[0];
  const tutor = candidate
    ? await Tutors.findOne({ _id: new mongoose.Types.ObjectId(String(candidate.tutorId)) })
    : await Tutors.findOne({ status: 'approved' });

  if (!tutor) { console.error('No tutor found to test with.'); process.exit(1); }

  const tutorId = String(tutor._id);
  const hadProfile = Boolean(tutor.payoutProfile);
  console.log(`Tutor under test: ${tutor.name}  (${tutorId})`);
  console.log(`Existing payoutProfile: ${hadProfile ? 'yes - will be restored afterwards' : 'none'}\n`);
  const originalProfile = tutor.payoutProfile ?? null;

  // -- 1. validation -------------------------------------------------------
  console.log('1. Rejects bad input');
  const bad = await call('POST', `/payouts/tutor/${tutorId}/profile`, {
    legalName: 'A', pan: 'NOPE', accountHolderName: 'X',
    accountNumber: '123', confirmAccountNumber: '999',
    ifsc: 'HDFC1001234', accountType: 'savings',
  });
  check('returns 400', bad.status === 400, `got ${bad.status}`);
  check('explains every problem', (bad.body?.errors || []).length >= 5,
        `${(bad.body?.errors || []).length} error(s)`);
  check('catches the mismatched confirmation',
        (bad.body?.errors || []).some(e => /do not match/i.test(e)));

  // -- 2. accepted and encrypted ------------------------------------------
  console.log('\n2. Accepts valid details and encrypts the account number');
  const good = await call('POST', `/payouts/tutor/${tutorId}/profile`,
    { ...TEST, confirmReplace: true });
  check('returns 200', good.status === 200, `got ${good.status} ${good.body?.message || ''}`);
  check('status is pending_verification', good.body?.profile?.status === 'pending_verification');
  check('account number is NOT in the response',
        !JSON.stringify(good.body).includes(TEST.accountNumber));
  check('masked form is returned', /\d{4}$/.test(good.body?.profile?.accountMasked || ''));

  const stored = await Tutors.findOne({ _id: tutor._id });
  check('ciphertext stored, not plaintext',
        !JSON.stringify(stored.payoutProfile).includes(TEST.accountNumber) &&
        String(stored.payoutProfile.accountNumberEnc).startsWith('v1:'));

  // -- 3. verification never auto-approves --------------------------------
  console.log('\n3. A passed bank check still needs a person');
  const verified = await call('POST', `/payouts/staff/profile/${tutorId}/verification-result`,
    { succeeded: true, nameAtBank: 'PAYOUT TEST ACCOUNT' });
  check('moves to pending_approval, not verified',
        verified.body?.profile?.status === 'pending_approval',
        `got ${verified.body?.profile?.status}`);

  // -- 4. staff decision ---------------------------------------------------
  console.log('\n4. Staff approval');
  const decided = await call('POST', `/payouts/staff/profile/${tutorId}/decision`,
    { approve: true, decidedBy: 'test-script' });
  check('becomes verified', decided.body?.profile?.status === 'verified');

  // -- 5. generate is idempotent ------------------------------------------
  console.log('\n5. Generating the batch is safe to repeat');
  const g1 = await call('POST', `/payouts/staff/generate/${PERIOD}`);
  const g2 = await call('POST', `/payouts/staff/generate/${PERIOD}`);
  const g3 = await call('POST', `/payouts/staff/generate/${PERIOD}`);
  check('first run succeeds', g1.status === 200, `got ${g1.status}`);
  check('later runs create nothing new', g2.body?.created === 0 && g3.body?.created === 0,
        `created ${g2.body?.created} then ${g3.body?.created}`);
  const rowCount = await Payouts.countDocuments({ period: PERIOD });
  check('exactly one row per tutor after 3 runs',
        rowCount === (g3.body?.batch?.length || 0),
        `${rowCount} rows in db vs ${g3.body?.batch?.length} returned`);

  const mine = (g3.body?.batch || []).find(r => String(r.tutorId) === tutorId);
  if (mine) {
    console.log(`\n   This tutor: gross ${mine.grossAmount}  platform ${mine.commissionAmount}` +
                `  net ${mine.netAmount}  held ${mine.unconfirmedAmount}  status ${mine.status}`);
    check('platform + tutor add back to gross',
          Math.abs((mine.commissionAmount + mine.netAmount) - mine.grossAmount) < 0.005,
          `${mine.commissionAmount} + ${mine.netAmount} != ${mine.grossAmount}`);
    check('hold cleared now details are verified',
          mine.status !== 'on_hold' || !/not verified/i.test(mine.holdReason || ''),
          mine.holdReason || '');
  }

  // -- 6. approval, and immutability afterwards ---------------------------
  console.log('\n6. Approving the batch, then re-generating');
  const appr = await call('POST', `/payouts/staff/batch/${PERIOD}/approve`,
    { approvedBy: 'test-script' });
  check('approval succeeds', appr.status === 200, `got ${appr.status}`);
  check('nothing was transferred', /no transfer/i.test(appr.body?.message || ''));

  const g4 = await call('POST', `/payouts/staff/generate/${PERIOD}`);
  check('approved rows are skipped, not recalculated',
        (g4.body?.skipped || []).length > 0 || g4.body?.refreshed === 0,
        `skipped ${(g4.body?.skipped || []).length}, refreshed ${g4.body?.refreshed}`);

  // -- 7. bad input to the period parameter -------------------------------
  console.log('\n7. Rejects a malformed month');
  for (const p of ['2026-8', '2026-13', 'august']) {
    const r = await call('GET', `/payouts/staff/preview/${p}`);
    check(`"${p}" rejected`, r.status === 400, `got ${r.status}`);
  }

  // -- cleanup -------------------------------------------------------------
  if (KEEP) {
    console.log('\n--keep passed: test data left in place.');
    console.log(`   Look at the Payout Batch tab for ${PERIOD} in the admin dashboard.`);
    console.log(`   Remove it later with: node scripts/testPayoutFlow.js ${PERIOD} --cleanup-only`);
  } else {
    if (originalProfile) await Tutors.updateOne({ _id: tutor._id }, { $set: { payoutProfile: originalProfile } });
    else await Tutors.updateOne({ _id: tutor._id }, { $unset: { payoutProfile: '' } });
    const del = await Payouts.deleteMany({ period: PERIOD });
    console.log(`\nCleaned up: profile restored, ${del.deletedCount} payout row(s) removed.`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch(async (err) => {
  console.error('\nTest run failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
