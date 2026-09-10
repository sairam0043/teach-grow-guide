/**
 * Authenticated encryption for individual database fields.
 *
 * Used for tutor bank account numbers, which are sensitive enough that a
 * database dump or an over-broad API response should not expose them. GCM is
 * used rather than CBC so that tampering is detected on decrypt rather than
 * silently producing garbage.
 *
 * Stored format:  v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 * The version prefix means the scheme can be rotated later without having to
 * guess how existing rows were written.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit nonce, the size GCM is specified for
const VERSION = 'v1';

let cachedKey = null;

/**
 * Resolve the 32-byte key from PAYOUT_ENCRYPTION_KEY.
 * Accepts 64-char hex or base64. Throws rather than falling back to a
 * hardcoded key: a predictable key is worse than a loud failure, because it
 * looks like encryption while providing none.
 */
function getKey() {
  if (cachedKey) return cachedKey;

  const raw = (process.env.PAYOUT_ENCRYPTION_KEY || '').trim();
  if (!raw) {
    throw new Error(
      '[fieldCrypto] PAYOUT_ENCRYPTION_KEY is not set. Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }

  if (key.length !== 32) {
    throw new Error(
      `[fieldCrypto] PAYOUT_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}.`
    );
  }

  cachedKey = key;
  return key;
}

/** True when a key is configured, so callers can degrade gracefully. */
function isConfigured() {
  try { getKey(); return true; } catch { return false; }
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return '';
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return '';
  const parts = String(payload).split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('[fieldCrypto] Unrecognised ciphertext format.');
  }
  const [, ivHex, tagHex, ctHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/** Display form for an account number: last four digits only. */
function maskAccount(accountNumber) {
  const s = String(accountNumber || '').replace(/\s/g, '');
  if (s.length < 4) return '';
  return '\u2022'.repeat(Math.max(4, s.length - 4)) + s.slice(-4);
}

module.exports = { encrypt, decrypt, maskAccount, isConfigured };
