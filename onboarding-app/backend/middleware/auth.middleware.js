const jwt = require('jsonwebtoken');
const { SESSION_COOKIE } = require('../config/security');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const STAFF_ROLES = new Set(['rm', 'compliance', 'compliance_external', 'admin']);
const COMPLIANCE_ROLES = new Set(['compliance', 'compliance_external', 'admin']);

// The browser sends the session in an httpOnly cookie, which page script
// cannot read — so an injected script can no longer steal a usable token.
// The Authorization header stays supported for callers that are not a browser
// (the test suites, scripts, and any future service-to-service use), where
// there is no cookie jar and no XSS surface to protect.
const tokenFrom = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[SESSION_COOKIE] || null;
};

const protect = (req, res, next) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authorised — no token' });
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorised — invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const staffOnly = (req, res, next) => {
  if (!req.user || !STAFF_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

const isStaffRole = (role) => STAFF_ROLES.has(role);

const complianceOnly = (req, res, next) => {
  if (!req.user || !COMPLIANCE_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: 'Compliance access required' });
  }
  next();
};

module.exports = { protect, adminOnly, staffOnly, complianceOnly, isStaffRole, tokenFrom };
