/**
 * Razorpay webhooks for Route.
 *
 * Mounted before express.json() in index.js, because signature verification
 * needs the exact bytes Razorpay signed. Re-serialising parsed JSON can reorder
 * keys and the signature would never match.
 *
 * Deliberately unauthenticated in the usual sense: Razorpay cannot present a
 * login. The HMAC signature is the authentication, and a request that fails it
 * is rejected before anything is read.
 */
const express = require('express');
const Booking = require('../schemas/bookingSchema');
const Tutor = require('../schemas/tutorSchema');
const { verifyWebhookSignature } = require('../utils/razorpayRoute');

const router = express.Router();

// Map Razorpay's transfer states onto the ones stored on the booking.
const TRANSFER_STATUS = {
  'transfer.processed': 'processed',
  'transfer.failed': 'failed',
  'transfer.reversed': 'reversed',
};

router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn('[Route webhook] Rejected: signature did not verify.');
    return res.status(400).json({ message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ message: 'Malformed payload' });
  }

  // Acknowledge immediately. Razorpay retries on a non-2xx, and a slow handler
  // causes duplicate deliveries; the work below is idempotent either way.
  res.json({ received: true });

  try {
    await handleEvent(event);
  } catch (err) {
    console.error('[Route webhook] Handler failed for', event?.event, '-', err.message);
  }
});

async function handleEvent(event) {
  const name = event?.event;

  if (TRANSFER_STATUS[name]) {
    const transfer = event?.payload?.transfer?.entity;
    if (!transfer?.id) return;

    const booking = await Booking.findOne({ 'routeTransfers.transferId': transfer.id });
    if (!booking) {
      console.warn('[Route webhook] No booking holds transfer', transfer.id);
      return;
    }

    const row = booking.routeTransfers.find((t) => t.transferId === transfer.id);
    if (!row || row.status === TRANSFER_STATUS[name]) return;   // already applied

    row.status = TRANSFER_STATUS[name];
    if (name === 'transfer.failed') {
      row.failureReason = transfer.error_description || 'Razorpay reported the transfer failed';
    }
    await booking.save();
    console.log(`[Route webhook] ${transfer.id} -> ${row.status} (booking ${booking._id})`);
    return;
  }

  // The linked account moving through Razorpay's KYC review.
  if (name === 'account.activated' || name === 'account.needs_clarification' ||
      name === 'account.suspended' || name === 'account.under_review') {
    const account = event?.payload?.account?.entity;
    if (!account?.id) return;

    const tutor = await Tutor.findOne({ 'payoutProfile.routeAccountId': account.id });
    if (!tutor) return;

    const status = name.replace('account.', '');
    tutor.payoutProfile.routeStatus = status;
    if (status === 'needs_clarification') {
      tutor.payoutProfile.routeLastError =
        'Razorpay needs more information before this account can receive payments.';
    }
    await tutor.save();
    console.log(`[Route webhook] Tutor ${tutor._id} linked account -> ${status}`);
  }
}

module.exports = router;
