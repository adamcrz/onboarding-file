// Periodic re-confirmation of the email address behind an account.
//
// A password proves only that it has not leaked. Every so often — not on every
// sign-in — the person is asked for a code sent to the address the account
// belongs to, which re-proves they still control it. Between those checks the
// sign-in is exactly as it was.
//
// ── Two conditions, and it is off unless BOTH hold ───────────────────────────
//
//   1. LOGIN_REVERIFY_DAYS is set to a positive number.
//   2. Real SMTP is configured (EMAIL_HOST + EMAIL_USER + EMAIL_PASS).
//
// The second is not a nicety. With no SMTP the app falls back to a fake inbox
// whose preview link is printed to the server console — invisible to anyone
// using a hosted instance. Demanding a code nobody can receive would lock every
// account out of the system at once, including the ones needed to turn it back
// off. So the check refuses to arm itself rather than trust configuration.
const crypto = require('crypto');

const REVERIFY_DAYS = Number.parseInt(process.env.LOGIN_REVERIFY_DAYS || '0', 10);
const SMTP_CONFIGURED = Boolean(
  process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS,
);

const CODE_TTL_MS = 10 * 60 * 1000;  // long enough to fetch an email, short enough to be useless later
const MAX_ATTEMPTS = 5;              // a 6-digit code is guessable given unlimited tries

// Armed only when both conditions hold. Exported so the reason can be reported
// at startup rather than discovered by a locked-out user.
function status() {
  if (!Number.isFinite(REVERIFY_DAYS) || REVERIFY_DAYS <= 0) {
    return { enabled: false, reason: 'LOGIN_REVERIFY_DAYS is not set' };
  }
  if (!SMTP_CONFIGURED) {
    return {
      enabled: false,
      reason: 'no real SMTP configured — a code would be sent to a fake inbox nobody can read',
    };
  }
  return { enabled: true, days: REVERIFY_DAYS };
}

const isEnabled = () => status().enabled;

// Whether this account is due. A user who has never been re-verified is dated
// from their last sign-in, so switching this on does not challenge everybody at
// once on the same morning.
function isDue(user) {
  if (!isEnabled()) return false;
  const since = user.lastReverifiedAt || user.lastLoginAt || user.createdAt;
  if (!since) return true;
  return (Date.now() - new Date(since).getTime()) > REVERIFY_DAYS * 24 * 60 * 60 * 1000;
}

// Stored as a hash: a readable code sitting in the users collection would let
// anyone with database access sign in as anybody.
const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

function issueCode(user) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.loginCodeHash = hash(code);
  user.loginCodeExpires = new Date(Date.now() + CODE_TTL_MS);
  user.loginCodeAttempts = 0;
  return code;
}

// Returns { ok } or { ok: false, error }. Consumes the code on success, and on
// running out of attempts, so neither a used nor a guessed-at code survives.
function verifyCode(user, submitted) {
  if (!user.loginCodeHash || !user.loginCodeExpires) {
    return { ok: false, error: 'No code was requested. Sign in again to get one.' };
  }
  if (Date.now() > new Date(user.loginCodeExpires).getTime()) {
    clearCode(user);
    return { ok: false, error: 'That code has expired. Sign in again to get a new one.' };
  }
  if ((user.loginCodeAttempts || 0) >= MAX_ATTEMPTS) {
    clearCode(user);
    return { ok: false, error: 'Too many incorrect codes. Sign in again to get a new one.' };
  }

  const given = hash(String(submitted || '').trim());
  const expected = user.loginCodeHash;
  // Constant-time compare so a wrong code cannot be narrowed down by timing.
  const same = given.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

  if (!same) {
    user.loginCodeAttempts = (user.loginCodeAttempts || 0) + 1;
    return { ok: false, error: 'That code is not right.' };
  }

  clearCode(user);
  user.lastReverifiedAt = new Date();
  return { ok: true };
}

function clearCode(user) {
  user.loginCodeHash = undefined;
  user.loginCodeExpires = undefined;
  user.loginCodeAttempts = 0;
}

module.exports = { status, isEnabled, isDue, issueCode, verifyCode, clearCode, CODE_TTL_MS };
