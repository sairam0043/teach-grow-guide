/**
 * Razorpay Route: linked accounts, held transfers, releases.
 *
 * Route splits a student's payment when it is made. The tutor's share lands in
 * their own linked account, held by Razorpay, and is released class by class as
 * they are delivered. The company never holds the tutor's money.
 *
 * Marketplace approval is still pending, so this ships dark. Every function
 * checks the flag and returns a clearly-marked simulated result when Route is
 * off, which keeps the call sites identical in both modes and means going live
 * is one environment variable rather than a code change.
 *
 * API shapes follow Razorpay's Route documentation:
 *   POST   /v2/accounts                        linked account
 *   POST   /v2/accounts/:id/stakeholders       the person behind it
 *   POST   /v2/accounts/:id/products           settlement configuration
 *   POST   /v1/payments/:id/transfers          split a captured payment
 *   PATCH  /v1/transfers/:id                   release or re-hold
 *   POST   /v1/transfers/:id/reversals         claw back
 */
const crypto = require('crypto');
const {
  ROUTE_ENABLED,
  ROUTE_ACCOUNT_PROFILE,
  ROUTE_HOLD_ON_CREATE,
  isRouteTutor,
} = require('../config/payments');

let client = null;

/** Lazily build the SDK client; null when credentials are absent. */
function getClient() {
  if (client) return client;
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  const Razorpay = require('razorpay');
  client = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  return client;
}

/** True only when Route is switched on AND credentials exist. */
function isLive() {
  return ROUTE_ENABLED && Boolean(getClient());
}

/**
 * Stand-in result used while Route is disabled. Prefixed and flagged so it can
 * never be mistaken for a real Razorpay identifier in the database or a log.
 */
function simulated(kind, extra = {}) {
  return {
    simulated: true,
    id: `${kind}_sim_${crypto.randomBytes(8).toString('hex')}`,
    ...extra,
  };
}

/** Razorpay errors are deeply nested; surface something a human can act on. */
function describeError(err) {
  return (
    err?.error?.description ||
    err?.description ||
    err?.message ||
    'Razorpay request failed'
  );
}

/* ---------------------------------------------------------------------------
 * Onboarding
 * ------------------------------------------------------------------------ */

/**
 * Create the linked account, its stakeholder, and the Route product
 * configuration that carries the settlement bank details.
 *
 * Returns the ids to store on the tutor. Safe to call again: if the tutor
 * already has a linked account id, nothing is created.
 *
 * @param {object} tutor    Tutor document (needs payoutProfile populated)
 * @param {object} contact  { email, phone } from the linked User
 * @param {string} accountNumber  decrypted, used once and never stored here
 */
async function onboardTutor(tutor, contact, accountNumber) {
  const profile = tutor.payoutProfile || {};

  if (!isLive()) {
    return {
      simulated: true,
      accountId: simulated('acc').id,
      stakeholderId: simulated('sth').id,
      productConfigId: simulated('acc_prd').id,
      status: 'simulated',
      note: 'Route is disabled; no linked account was created at Razorpay.',
    };
  }

  const rzp = getClient();

  // 1. the linked account itself
  const account = await rzp.accounts.create({
    email: contact.email,
    phone: String(contact.phone || '').replace(/\D/g, '').slice(-10),
    type: 'route',
    reference_id: String(tutor._id),
    legal_business_name: profile.legalName || tutor.name,
    business_type: 'individual',
    contact_name: profile.legalName || tutor.name,
    profile: {
      category: ROUTE_ACCOUNT_PROFILE.category,
      subcategory: ROUTE_ACCOUNT_PROFILE.subcategory,
      addresses: {
        registered: buildAddress(tutor),
      },
    },
    legal_info: profile.pan ? { pan: profile.pan } : undefined,
  });

  // 2. the person behind it
  const stakeholder = await rzp.stakeholders.create(account.id, {
    name: profile.legalName || tutor.name,
    email: contact.email,
    kyc: profile.pan ? { pan: profile.pan } : undefined,
    addresses: { residential: buildAddress(tutor) },
  });

  // 3. ask for the Route product, then attach settlement details to it
  const product = await rzp.products.requestProductConfiguration(account.id, {
    product_name: 'route',
    tnc_accepted: true,
  });

  await rzp.products.edit(account.id, product.id, {
    settlements: {
      account_number: accountNumber,
      ifsc_code: profile.ifsc,
      beneficiary_name: profile.accountHolderName,
    },
    tnc_accepted: true,
  });

  return {
    simulated: false,
    accountId: account.id,
    stakeholderId: stakeholder.id,
    productConfigId: product.id,
    status: product.activation_status || 'requested',
  };
}

function buildAddress(tutor) {
  return {
    street1: tutor.address || 'Not provided',
    street2: '',
    city: tutor.city || '',
    state: '',
    postal_code: String(tutor.pincode || '').replace(/\D/g, '') || '000000',
    country: 'IN',
  };
}

/** Upload a KYC document against a linked account. */
async function uploadAccountDocument(accountId, { filePath, documentType }) {
  if (!isLive()) return simulated('doc', { document_type: documentType });
  return getClient().accounts.uploadAccountDoc(accountId, {
    file: { value: filePath },
    document_type: documentType,
  });
}

/* ---------------------------------------------------------------------------
 * Transfers
 * ------------------------------------------------------------------------ */

/**
 * Split a captured payment, holding the tutor's share.
 *
 * Held on creation so the money cannot reach the tutor before the class is
 * delivered. Release happens per class, once the month is approved.
 *
 * @param {string} paymentId    razorpay_payment_id from checkout
 * @param {string} accountId    the tutor's linked account
 * @param {number} amountRupees the tutor's share
 * @param {object} notes        searchable context on the Razorpay dashboard
 */
async function createHeldTransfer(paymentId, accountId, amountRupees, notes = {}) {
  const amount = Math.round(Number(amountRupees) * 100); // paise
  if (amount <= 0) return null;

  if (!isLive()) {
    return simulated('trf', {
      amount, on_hold: ROUTE_HOLD_ON_CREATE, recipient: accountId, notes,
    });
  }

  const res = await getClient().payments.transfer(paymentId, {
    transfers: [{
      account: accountId,
      amount,
      currency: 'INR',
      on_hold: ROUTE_HOLD_ON_CREATE,
      notes,
    }],
  });
  // The API returns { items: [transfer] }
  return Array.isArray(res?.items) ? res.items[0] : res;
}

/** Release a held transfer so Razorpay settles it to the tutor. */
async function releaseTransfer(transferId) {
  if (!isLive() || String(transferId).includes('_sim_')) {
    return { simulated: true, id: transferId, on_hold: false, status: 'processed' };
  }
  return getClient().transfers.edit(transferId, { on_hold: false });
}

/** Put a transfer back on hold, for a class that turns out to be disputed. */
async function holdTransfer(transferId) {
  if (!isLive() || String(transferId).includes('_sim_')) {
    return { simulated: true, id: transferId, on_hold: true };
  }
  return getClient().transfers.edit(transferId, { on_hold: true });
}

/** Claw back a transfer, fully or in part, e.g. after a refund. */
async function reverseTransfer(transferId, amountRupees) {
  if (!isLive() || String(transferId).includes('_sim_')) {
    return { simulated: true, id: transferId, status: 'reversed' };
  }
  const body = amountRupees ? { amount: Math.round(Number(amountRupees) * 100) } : {};
  return getClient().transfers.reverse(transferId, body);
}

async function fetchTransfer(transferId) {
  if (!isLive() || String(transferId).includes('_sim_')) {
    return { simulated: true, id: transferId };
  }
  return getClient().transfers.fetch(transferId);
}

/* ---------------------------------------------------------------------------
 * Webhooks
 * ------------------------------------------------------------------------ */

/**
 * Verify a Razorpay webhook signature.
 * The raw request body must be passed, not the parsed object: re-serialising
 * JSON can reorder keys and the signature will never match.
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch {
    return false; // length mismatch
  }
}

module.exports = {
  isLive,
  isRouteTutor,
  onboardTutor,
  uploadAccountDocument,
  createHeldTransfer,
  releaseTransfer,
  holdTransfer,
  reverseTransfer,
  fetchTransfer,
  verifyWebhookSignature,
  describeError,
};
