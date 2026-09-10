# Tutor Payment System — Requirements

Everything needed to pay tutors a monthly share of what students paid, with a
human approving before money moves.

**Status:** planning. No payout code exists yet.
**Branch:** `abhi-work` · **Split:** 70% tutor / 30% platform (code is currently 90/10)

> ⚠️ Razorpay changes onboarding requirements over time and some limits are
> negotiated per account. Confirm specifics with your account manager before
> anyone builds against them.

---

## 1. What "semi-autonomous" means

The system does everything except release funds.

| Step | Who | Automatic |
|---|---|---|
| Tutor submits bank + tax details | Tutor | — |
| Bank account validated (penny-drop) | System | ✅ |
| Details approved | Admin | ❌ |
| Month-end amounts calculated | System | ✅ |
| Payout batch generated as `pending_approval` | System | ✅ |
| **Batch reviewed and released** | **Admin** | ❌ |
| Transfer fired at Razorpay | System | ✅ |
| Status reconciled from webhook | System | ✅ |

The manual gate is the point: a calculation bug produces a wrong number on a
screen, not a wrong transfer to 200 people.

---

## 2. Documents required from tutors

This depends entirely on which Razorpay product you use.

| Document | RazorpayX Payouts | Razorpay Route |
|---|:---:|:---:|
| **PAN card** | ✅ | ✅ |
| **Bank proof** — cancelled cheque, passbook first page, or bank statement first page | ✅ | ✅ |
| Address proof — Aadhaar, passport, voter ID, licence, or utility bill | — | ✅ |
| Photo ID — usually Aadhaar | — | ✅ |
| GST certificate | if registered | if registered |
| Business registration | — | if not an individual |
| **Typical individual tutor** | **2** | **4** |

**Why each is needed:**

- **PAN** — your TDS obligation under Indian tax law. Without one on file, TDS is
  deducted at a substantially higher rate. Also the tutor's legal identity anchor.
- **Bank proof** — confirms account holder name, account number, and IFSC actually
  match. This is what prevents misdirected payments.
- **Address proof / photo ID** — required only under Route, because Razorpay runs
  KYC on each linked account.

Under RazorpayX the API asks for **zero** documents. Both mandatory items are for
your own compliance and dispute defence, not Razorpay's gate.

Neither list replaces `verificationDocument` (the resume/CV already mandatory at
registration in [`authRoutes.js`](backend/routes/authRoutes.js)) — that is
qualification evidence, not KYC.

---

## 3. Choosing the product

### RazorpayX Payouts

```
Student pays → your account → your RazorpayX current account
                                      │ month end, after approval
                                      ↓
                              tutor's bank account
```

You hold 100% of the money between collection and payout. The 70/30 split is
purely your bookkeeping — Razorpay never sees it.

**Needs:** a RazorpayX current account.
**Good:** simple API, minimal onboarding, full control over timing.
**Bad:** you hold student money as float, which carries regulatory weight in
India — get legal advice. Refunds after payout mean clawing money back manually.

### Razorpay Route

```
Student pays → split at payment
               ├── 30% → you, settles normally
               └── 70% → tutor's linked account, ON HOLD
                              │ released per session delivered
                              ↓
                     settles to tutor's bank
```

**Needs:** marketplace approval, plus KYC per tutor.
**Good:** fits monthly packs almost exactly — student pays upfront, funds sit
held, released per class delivered, which is what
[`bookingSchema.sessions`](backend/schemas/bookingSchema.js) already tracks.
Refunds are clean. You never hold tutor funds.
**Bad:** four documents and a KYC wait per tutor is real signup friction.

### Recommendation

**Route**, if Razorpay approves you.

The deciding factor is your monthly packs. A student pays ₹4,200 upfront for 12
classes across a month. Under RazorpayX that whole sum sits in your account for
weeks — money you owe but hold, with a refund obligation if the tutor stops
showing up. Under Route it sits at Razorpay and releases per class.

Choose RazorpayX if marketplace approval is refused or slow, or if four KYC
documents would choke signups. It's the pragmatic option, not the wrong one.

**Do now:** apply for marketplace approval. It's the long pole, costs nothing to
start, and all the shared work in §5–6 is identical either way.

---

## 4. Data required from tutors

Thirteen fields, two uploads, one checkbox. Everything else is derived — bank
name and branch from the IFSC, contact details from the existing `User` record,
amounts from booking data.

### Bank — mandatory

| Field | Validation | Notes |
|---|---|---|
| `accountHolderName` | 3–120 chars | Must match the bank's record **exactly**. Not the display name — joint accounts and maiden names differ constantly. |
| `accountNumber` | 9–18 digits | Encrypt at rest. Never return in full. |
| `confirmAccountNumber` | must equal above | Form-only, not persisted. Prevents the most common payout failure. |
| `ifsc` | `^[A-Z]{4}0[A-Z0-9]{6}$` | 5th char is always zero. Bank + branch derive from it. |
| `accountType` | `savings` \| `current` | |
| `vpa` | `^[\w.\-]{3,50}@[a-zA-Z]{3,}$` | Optional. Cheaper and faster, but caps near ₹1 lakh per transaction. |

### Tax identity — mandatory

| Field | Validation | Notes |
|---|---|---|
| `pan` | `^[A-Z]{5}[0-9]{4}[A-Z]$` | 4th char `P` = individual. |
| `legalName` | as printed on PAN | Frequently differs from `full_name`. |
| `dateOfBirth` | ISO date | KYC. |
| `gstin` | `^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$` | Optional — most individual tutors are below the threshold. |

> **Get a CA to confirm the tax treatment before going live.** Which section
> applies (194-O as e-commerce operator vs 194J for professional services), the
> rate, thresholds, and whether tutoring qualifies for a GST education exemption
> are business decisions with real liability.

### Consent — mandatory

| Field | Notes |
|---|---|
| `commissionAckAt` | Timestamp of acceptance |
| `commissionAckRate` | Store the rate acknowledged, not just the fact |
| `payoutTermsVersion` | Which terms version they accepted |

### The tutor-facing form

1. Legal name (as on PAN) · 2. PAN number · 3. Date of birth · 4. GST registered?
→ GSTIN · 5. Account holder name · 6. Account number · 7. Confirm account number
· 8. IFSC · 9. Account type · 10. UPI ID *(optional)* · 11. Upload bank proof ·
12. Upload PAN card · 13. ☐ Accept commission and payout terms

---

## 5. Schema changes

### On `tutorSchema`

```js
payoutDetails: {
  legalName: String,
  pan: { type: String, uppercase: true, trim: true },
  dateOfBirth: Date,
  gstin: { type: String, uppercase: true, trim: true },

  accountHolderName: String,
  accountNumberEnc: String,      // encrypted at rest
  accountLast4: String,          // safe to display
  ifsc: { type: String, uppercase: true, trim: true },
  accountType: { type: String, enum: ['savings', 'current'] },
  vpa: { type: String, lowercase: true, trim: true },

  bankProofId: mongoose.Schema.Types.ObjectId,
  panProofId: mongoose.Schema.Types.ObjectId,

  // whichever product you pick
  razorpayContactId: String,
  razorpayFundAccountId: String,
  razorpayLinkedAccountId: String,

  status: {
    type: String,
    enum: ['not_submitted','pending_verification','penny_drop_failed',
           'pending_approval','verified','rejected'],
    default: 'not_submitted'
  },
  pennyDropName: String,
  pennyDropAt: Date,
  rejectionReason: String,
  verifiedAt: Date,
  verifiedBy: String,

  commissionAckAt: Date,
  commissionAckRate: Number,
  payoutTermsVersion: String
}
```

### New `payoutSchema` — the ledger

This is what makes the system safe to re-run. Without it, a retried month-end job
pays everyone twice.

```js
{
  tutorId: { type: ObjectId, ref: 'Tutor', required: true },
  period: { type: String, required: true },        // "2026-08"

  grossAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true }, // stored, not assumed
  commission: { type: Number, required: true },
  tdsAmount: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },

  sessionCount: Number,
  bookingIds: [{ type: ObjectId, ref: 'Booking' }], // audit trail

  status: {
    type: String,
    enum: ['pending_approval','approved','processing','processed','failed','cancelled'],
    default: 'pending_approval'
  },
  approvedBy: String,
  approvedAt: Date,

  razorpayPayoutId: String,
  razorpayUtr: String,
  failureReason: String,
  idempotencyKey: { type: String, required: true }  // payout_<tutorId>_<period>
}

payoutSchema.index({ tutorId: 1, period: 1 }, { unique: true });
```

That unique index is the single most important line here — it's what makes the
job safe to retry.

Store `commissionRate` **per record**. If the split changes next year, historical
payouts must still show what was actually applied.

---

## 6. Blockers in the current codebase

Three things must be fixed before any of this can run.

1. **`phone` is optional** on [`userSchema.js:9`](backend/schemas/userSchema.js#L9).
   Both Razorpay products require it. Must become mandatory for tutors.

2. **`/admin/payouts` takes 8.4 seconds** —
   [`dashboardRoutes.js:354`](backend/routes/dashboardRoutes.js#L354) runs one
   `Booking.find()` per tutor: 267 sequential queries producing 10 rows. Vercel
   functions time out at 10s on Hobby. A month-end job on this path fails before
   paying anyone. Needs a single batched query.

3. **No in-process scheduler is possible.** The backend now runs as a Vercel
   serverless function ([`backend/vercel.json`](backend/vercel.json)), so
   `node-cron` cannot work — nothing stays alive between requests. Use Vercel
   Cron hitting a protected HTTP endpoint. That endpoint **must** require a
   shared secret; an unauthenticated payout trigger is an open door.

Also unresolved: the session-completion signal.
[`dashboardRoutes.js:417-420`](backend/routes/dashboardRoutes.js#L417-L420)
treats a booking as delivered once the clock has passed. Fine for a report; as a
*payment trigger* it pays tutors who never showed up. Packs are safer — they use
explicit `session.status === 'completed'`.

---

## 7. Verification flow

```
submitted → penny-drop (₹1 to the account, read back the name)
            ├── name matches    → pending_approval → admin → verified
            ├── name mismatch   → pending_approval (flag for human)
            └── transfer failed → penny_drop_failed (bad account/IFSC)
```

Razorpay's Fund Account Validation API does this. Name matching is fuzzy in
practice — `RAJESH KUMAR S` vs `S Rajesh Kumar` is the same person — so treat a
mismatch as *route to a human*, never auto-reject.

**No tutor reaches `verified` without a human approving it.**

---

## 8. Handling this data

Bank details and PAN are sensitive personal and financial data.

- **Encrypt `accountNumber` at rest.** Keep `accountLast4` separately for display.
- **Never return the full account number** from any API. Mask to `••••••3421`.
- **Do not log it.** [`paymentRoutes.js`](backend/routes/paymentRoutes.js) is
  very chatty with `console.log` — payout code must not follow that pattern.
  Vercel function logs are retained and searchable.
- **Audit every change.** Bank detail edits are a classic account-takeover
  target: change the account, wait for payday. Re-verify on edit and email the
  tutor on any change.
- **Check `/api/upload/file/:id` is authenticated** before putting PAN cards
  behind it.

---

## 9. Open decisions

| # | Question | Blocks |
|---|---|---|
| 1 | Marketplace approval — applied for? | Product choice |
| 2 | Commission model on discounted packs | Deferred — the 3-day pack's 30% student discount exactly equals the 30% platform share, so tutor and platform cannot both be made whole on that plan |
| 3 | TDS deducted at source, or left to the tutor? | `tdsAmount`; needs a CA |
| 4 | Minimum payout threshold (e.g. ₹500)? | Stops ₹12 transfers costing more in fees |
| 5 | Earnings for an unverified tutor? | Accrue and hold, presumably |
| 6 | Payout day, and cutoff for late-marked sessions | Cron schedule |
