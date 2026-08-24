// Everything that decides who may reach this server, and on what terms. Kept in
// one file so the whole posture can be read at once instead of being inferred
// from middleware scattered across server.js.
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const isProduction = () => process.env.NODE_ENV === 'production';

// A deployment that forgets JWT_SECRET must not silently fall back to the
// well-known development value — every token it issued would be forgeable by
// anyone who has read this repository. Fail at startup, loudly, where it is
// obvious, rather than at the first login, where it looks like it worked.
function assertSecretsPresent() {
  const secret = process.env.JWT_SECRET;
  if (!isProduction()) return;

  const problems = [];
  if (!secret) problems.push('JWT_SECRET is not set');
  else if (secret === 'dev-secret-change-in-production') problems.push('JWT_SECRET is still the development placeholder');
  else if (secret.length < 32) problems.push('JWT_SECRET is shorter than 32 characters');
  if (!process.env.MONGO_URI) problems.push('MONGO_URI is not set');
  if (process.env.ALLOW_DATABASE_RESET === 'true') problems.push('ALLOW_DATABASE_RESET must not be enabled in production');

  if (problems.length) {
    console.error('\n❌  Refusing to start in production:\n' + problems.map(p => `    · ${p}`).join('\n') + '\n');
    process.exit(1);
  }
}

// Browsers may call this API from the app's own origin and nowhere else.
// ALLOWED_ORIGINS is a comma-separated list; in development the local dev
// servers are allowed so the existing workflow is unchanged.
//
// Written as a per-request delegate rather than a fixed option object so the
// request's own Host is available — see the same-origin rule below.
function corsOptions() {
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',').map(o => o.trim()).filter(Boolean);
  const allowed = configured.length ? configured : (isProduction() ? [] : [
    'http://localhost:5000', 'http://127.0.0.1:5000',
    'http://localhost:5500', 'http://127.0.0.1:5500',
  ]);

  // This server serves the frontend as well as the API, so the browser's own
  // page is always same-origin with the API it calls. Browsers still send an
  // Origin header on same-origin POST/PUT/DELETE, so without this a deployment
  // that has not set ALLOWED_ORIGINS rejects its own login form — the app
  // looks completely broken for a configuration mistake CORS was never meant
  // to catch. Same-origin is not cross-site: there is nothing here to protect.
  const isSameOrigin = (origin, req) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (!host) return false;
    // Behind a TLS-terminating proxy the request arrives as http, so compare
    // the host only — the scheme is the proxy's business, not the browser's.
    try { return new URL(origin).host === host; } catch (_) { return false; }
  };

  return (req, callback) => {
    callback(null, {
      origin(origin, cb) {
        // No Origin header: same-origin navigation, curl, or a server-to-server
        // call. These are not cross-site requests, so there is nothing for CORS
        // to protect against — the auth middleware still decides access.
        if (!origin) return cb(null, true);
        if (isSameOrigin(origin, req)) return cb(null, true);
        if (allowed.includes(origin)) return cb(null, true);
        cb(new Error(`Origin ${origin} is not allowed`));
      },
      credentials: true, // the session cookie must travel with API calls
    });
  };
}

// Content-Security-Policy is deliberately not at its strictest: the SPA uses
// inline `onclick` handlers throughout, which require 'unsafe-inline' in
// script-src. That is a known limitation, not an oversight — removing those
// handlers is a refactor of its own. Everything else is locked down, so an
// injected script still cannot load remote code or send data off-origin.
function helmetOptions() {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        // helmet defaults this to 'none', which blocks every inline onclick —
        // and this SPA is built almost entirely on inline handlers, so that
        // default takes the whole interface out. Allowing them is the price of
        // not rewriting every handler; removing them is a refactor of its own.
        scriptSrcAttr: ["'unsafe-inline'"],
        // The interface loads Raleway and Roboto from Google Fonts; the
        // stylesheet comes from googleapis and the font files from gstatic.
        // Both hosts are needed or the app renders in a fallback face.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        // Only meaningful once there is a certificate; on a plain-HTTP dev
        // server it rewrites requests to https and breaks local testing.
        upgradeInsecureRequests: isProduction() ? [] : null,
      },
    },
    // Downloads are served from this origin and opened by the browser; the
    // default same-origin policy would block the blob URLs the SPA creates.
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction() ? { maxAge: 15552000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  };
}

// Limits apply in every environment so the middleware is genuinely exercised,
// but development and the test suites run hundreds of calls from one address in
// seconds. Production gets the real caps; everywhere else gets a ceiling high
// enough to be invisible while still proving the path works.
const limitFor = (production, development) => () => (isProduction() ? production : development);

// Password guessing is cheap and unattended. These caps make it slow enough to
// be useless without getting in the way of someone mistyping their password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limitFor(10, 10000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the cap
  message: { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' },
});

// Password-reset and verification mails are sent to an address the caller
// supplies, so an unlimited endpoint is a way to send mail through this server.
const accountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: limitFor(5, 10000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Wait an hour and try again.' },
});

// Everything else: generous enough to be invisible in normal use, low enough
// to stop a script enumerating the API.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: limitFor(300, 100000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down and try again shortly.' },
});

// The session cookie. httpOnly is the point of the exercise: script running in
// the page — injected or otherwise — cannot read it, so an XSS bug can no
// longer walk away with a usable session token. SameSite=Strict means it is not
// sent on cross-site requests, which is what closes CSRF.
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // one working day
    path: '/',
  };
}

const SESSION_COOKIE = 'session';

module.exports = {
  assertSecretsPresent,
  corsOptions,
  helmetOptions,
  loginLimiter,
  accountLimiter,
  apiLimiter,
  sessionCookieOptions,
  SESSION_COOKIE,
  isProduction,
};
