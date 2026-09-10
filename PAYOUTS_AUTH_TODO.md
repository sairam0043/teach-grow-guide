# Payouts — endpoints that must be protected

The payout system was built with authentication explicitly out of scope. This
is the handover list for whoever does that work.

**None of the endpoints below check who is calling them.** That is not specific
to payouts — it is true of the entire backend.

---

## The wider problem

```
jwt.sign     3 occurrences   (login, register, Google sign-in)
jwt.verify   0 occurrences   anywhere in backend/
```

A token is issued at login and never checked again. `src/components/ProtectedRoute.tsx`
gates the React UI only; it has no effect on the API. Anyone who can reach the
server can call any route.

| Route file | Routes | Protected |
|---|---:|---:|
| `authRoutes.js` | 12 | 0 |
| `dashboardRoutes.js` | 18 | 0 |
| `paymentRoutes.js` | 9 | 0 |
| `tutorRoutes.js` | 18 | 0 |
| `payoutRoutes.js` *(new)* | 9 | 0 |
| `messageRoutes.js` | 3 | 0 |
| `uploadRoutes.js` | 3 | 0 |
| `chatbotRoutes.js` | 1 | 0 |

Verified live against the running server, no auth header sent:

```
GET /api/dashboard/admin/payouts   ->  200 OK
     297 tutors, 1 with a real bank account number and IFSC
```

---

## New endpoints from this work

All under `/api/payouts`. Each handler carries an `[assumes: ...]` comment
naming the role it was written for.

| Method | Path | Should be restricted to | Risk if left open |
|---|---|---|---|
| GET | `/tutor/:tutorId/profile` | That tutor, or staff | Leaks PAN, legal name, masked account, IFSC |
| POST | `/tutor/:tutorId/profile` | **That tutor only** | Anyone can redirect a tutor's payments to their own account |
| GET | `/tutor/:tutorId/history` | That tutor, or staff | Leaks earnings history |
| POST | `/staff/profile/:tutorId/verification-result` | Staff | Fake a passed bank check |
| POST | `/staff/profile/:tutorId/decision` | Staff | Self-approve an unverified account |
| GET | `/staff/preview/:period` | Staff | Exposes every tutor's earnings |
| POST | `/staff/generate/:period` | Staff | Write ledger rows at will |
| GET | `/staff/batch/:period` | Staff | Exposes the whole batch |
| POST | `/staff/batch/:period/approve` | **Finance only** | Approve payments without authority |
| POST | `/staff/payout/:id/status` | Staff | Mark unpaid payouts as paid |

The two that matter most are `POST /tutor/:tutorId/profile` and
`POST /staff/batch/:period/approve`. The first is how money gets redirected;
the second is how it gets released.

---

## Pre-existing endpoints this system depends on

These already existed and are unchanged, but the payout calculation now
depends on them, so leaving them open has a direct financial effect.

| Method | Path | Why it matters here |
|---|---|---|
| PUT | `/api/tutors/booking/:bookingId/session/:sessionIdx/status` | Marks a class complete. Completion is what makes a class payable **and** what triggers referral wallet credits. No check of any kind — anyone with a booking id can trigger both. |
| POST | `/api/dashboard/admin/payouts/record` | Writes a disbursement record to `tutor.payoutHistory` |
| GET | `/api/dashboard/admin/payouts` | Returns full `paymentDetails` including account numbers |
| POST | `/api/dashboard/admin/send-bank-reminder` | Sends email to tutors |

---

## Suggested shape

Not built, since auth was out of scope. Roughly what is needed:

```js
// backend/middleware/auth.js
const requireAuth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);  // { userId, role }
    next();
  } catch {
    res.status(401).json({ message: 'Authentication required' });
  }
};

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'Not permitted' });

// Ownership matters as much as role: a tutor must not be able to write
// another tutor's payout profile just because they are also a tutor.
const requireSelfOrStaff = (paramName) => async (req, res, next) => { /* ... */ };
```

Applied as:

```js
router.post('/tutor/:tutorId/profile', requireAuth, requireSelfOrStaff('tutorId'), handler);
router.post('/staff/batch/:period/approve', requireAuth, requireRole('admin', 'hr'), handler);
```

The frontend already stores a token at login; it would need to send it as an
`Authorization: Bearer` header, most simply via an axios request interceptor
set up once in `src/config/api.ts`.

---

## Two things that are safe today

Worth knowing so effort goes where it is needed:

- **Account numbers are encrypted at rest** (AES-256-GCM, `backend/utils/fieldCrypto.js`)
  and never returned by any payout endpoint — only the last four digits. A
  leak of the new `payoutProfile` exposes far less than the existing
  `paymentDetails`, which is stored and returned in plain text.
- **No endpoint moves money.** Approving a batch records a decision; no payment
  provider is connected. The damage from an unauthenticated call today is bad
  data and disclosure, not lost funds. That changes the moment transfers are
  wired up — which is the deadline for this work.
