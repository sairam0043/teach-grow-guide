/**
 * Authentication and authorisation middleware.
 *
 * Until now this backend signed JWTs at login and never verified them again --
 * `jwt.verify` appeared nowhere, and ProtectedRoute on the frontend only hid
 * UI. Every route was callable by anyone who knew the URL.
 *
 * These helpers are the server-side half. They are applied route by route
 * rather than globally, because much of this API is deliberately public
 * (browsing tutors, registering, logging in) and a blanket guard would break it.
 *
 * Tokens are issued in routes/authRoutes.js as: { userId, role }
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'teachgrow_jwt_secret_key';

/** Roles that may act on behalf of the platform rather than for themselves. */
const STAFF_ROLES = ['admin', 'hr'];

/** Pull a bearer token off the request, tolerating the usual header shapes. */
function extractToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  // Some clients send the raw token; accept it rather than silently 401-ing.
  if (typeof header === 'string' && header.length > 40 && !header.includes(' ')) {
    return header.trim();
  }
  return null;
}

function verify(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Attaches req.user when a valid token is present, but never rejects.
 * For endpoints that are public yet behave differently for a signed-in user.
 */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verify(token);
    if (payload) req.user = payload;
  }
  next();
}

/** Rejects anything without a valid, unexpired token. */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Sign in to continue.', code: 'NO_TOKEN' });
  }
  const payload = verify(token);
  if (!payload) {
    // Covers both a tampered token and an expired one. The client treats 401
    // as "log out and send them to sign in again".
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.', code: 'BAD_TOKEN' });
  }
  req.user = payload;
  next();
}

/**
 * Restricts to specific roles. Always used after requireAuth.
 *   router.post('/x', requireAuth, requireRole('admin', 'hr'), handler)
 */
function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Sign in to continue.', code: 'NO_TOKEN' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.', code: 'WRONG_ROLE' });
    }
    next();
  };
}

/** Convenience: admin or hr. */
const requireStaff = requireRole(STAFF_ROLES);

/**
 * Ownership check for routes keyed by a Tutor id.
 *
 * Role alone is not enough here: every tutor has role 'tutor', so a role-only
 * guard would let any tutor rewrite another tutor's bank details. Staff pass
 * through; a tutor passes only for their own record.
 */
function requireTutorSelfOrStaff(paramName = 'tutorId') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Sign in to continue.', code: 'NO_TOKEN' });
    }
    if (STAFF_ROLES.includes(req.user.role)) return next();

    const tutorId = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ message: 'Invalid tutor id' });
    }

    try {
      // Required lazily: this module is loaded before the models in some
      // entry points, and requiring at the top would create a cycle.
      const Tutor = require('../schemas/tutorSchema');
      const tutor = await Tutor.findById(tutorId).select('userId').lean();
      if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

      if (String(tutor.userId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'You can only access your own details.', code: 'NOT_OWNER' });
      }
      next();
    } catch (err) {
      res.status(500).json({ message: 'Could not verify ownership', error: err.message });
    }
  };
}

/** Same idea for routes keyed directly by a User id. */
function requireUserSelfOrStaff(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Sign in to continue.', code: 'NO_TOKEN' });
    }
    if (STAFF_ROLES.includes(req.user.role)) return next();
    if (String(req.params[paramName]) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'You can only access your own details.', code: 'NOT_OWNER' });
    }
    next();
  };
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  requireStaff,
  requireTutorSelfOrStaff,
  requireUserSelfOrStaff,
  STAFF_ROLES,
};
