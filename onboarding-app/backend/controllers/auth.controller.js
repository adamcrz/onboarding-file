const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Client = require('../models/Client');
const { sendVerificationEmail, sendPasswordResetEmail, sendNewSignInAlertEmail, sendLoginCodeEmail } = require('../services/email.service');
const reverify = require('../services/loginReverify.service');
const { ensureKycTaskForClient } = require('../services/kycTask.service');
const { SESSION_COOKIE, sessionCookieOptions } = require('../config/security');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
// How long since a client's last successful login before a fresh sign-in
// counts as "after a while" and earns an informational heads-up email.
const STALE_LOGIN_DAYS = 14;

// Issues the session two ways at once: an httpOnly cookie the browser will
// send automatically and cannot read from script, and the token in the body
// for non-browser callers (test suites, scripts). The browser is expected to
// ignore the body value — see api.js, which no longer stores it.
function issueSession(res, user) {
  const token = signToken(user);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  return token;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name, rmCode: user.rmCode || null },
    SECRET,
    // Long enough that a normal work session (or a page refresh days later)
    // never silently drops the user back to the login screen mid-task.
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, rmCode: user.rmCode || null };
}

// POST /api/auth/logout
// Signing out has to happen server-side now: an httpOnly cookie cannot be
// removed by the page that set it, which is exactly the property that makes it
// safe from injected script.
const logout = (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.status(200).json({ message: 'Signed out.' });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    // Public self-registration is for clients only. Staff roles grant access
    // to every KYC/case workflow and require trusted admin provisioning.
    if (role && role !== 'client') {
      return res.status(403).json({ error: 'Staff accounts cannot be created through public registration.' });
    }
    const resolvedRole = 'client';

    const existing = await User.findOne({ email: email.toLowerCase(), role: resolvedRole });
    if (existing)
      return res.status(400).json({ error: 'An account with that email already exists.' });

    const user = new User({ name, email, password, role: resolvedRole });

    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    if (user.role === 'client') {
      const clientId = await Client.generateClientId();
      // No gap-check here — a brand new client hasn't attempted their KYC
      // yet, so nothing should read as "missing" until their first
      // submission (see completeKycTask / resubmitKycSection).
      const client = await Client.create({
        clientId,
        userId: user._id,
        email:  user.email,
        name:   user.name,
        type:   'Individual',
        status: 'pending',
      });
      await ensureKycTaskForClient(client, '');
    }

    let emailPreviewUrl = null;
    try {
      const result = await sendVerificationEmail(user.email, user.name, verificationToken);
      emailPreviewUrl = result?.previewUrl || null;
    } catch (emailErr) {
      console.error('⚠  Verification email failed to send:', emailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      email:   user.email,
      emailPreviewUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    // The same email can hold an account in more than one role category, so
    // the portal the user picked (sent as `role`) disambiguates which
    // account to check. Without it, fall back to whichever account matches
    // (pre-existing callers that don't send a portal yet).
    const user = await User.findOne(role ? { email: email.toLowerCase(), role } : { email: email.toLowerCase() });
    if (!user) {
      // No account in the selected portal — but the same email might have an
      // account under a *different* category (e.g. an RM logging into the
      // Compliance portal by mistake). Only reveal that if the password
      // actually matches that other account, same as a normal login would.
      if (role) {
        const otherAccounts = await User.find({ email: email.toLowerCase(), role: { $ne: role } });
        for (const other of otherAccounts) {
          if (await other.comparePassword(password)) {
            const names = { compliance: 'Internal Compliance', compliance_external: 'External Compliance', rm: 'Rel. Manager', client: 'Client' };
            return res.status(401).json({
              error: `These credentials belong to the ${names[other.role] || other.role} portal. Please go back and select the correct portal.`,
            });
          }
        }
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        code:  'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    // Periodic re-confirmation of the address behind the account. Armed only
    // when it is switched on AND real mail can actually be sent — see
    // services/loginReverify.service.js for why that second condition is not
    // optional.
    if (reverify.isDue(user)) {
      const code = reverify.issueCode(user);
      await user.save();
      try {
        await sendLoginCodeEmail(user.email, user.name, code, reverify.CODE_TTL_MS);
        return res.status(200).json({
          reverifyRequired: true,
          email: user.email,
          role: user.role,
          message: `For security, enter the code we just sent to ${user.email}.`,
        });
      } catch (err) {
        // The mail did not go out. Blocking here would lock an account out
        // over a problem it has no part in and cannot fix, so the sign-in
        // proceeds and this round of the check is skipped.
        console.error('⚠  Login code email failed; allowing sign-in without it:', err.message);
        reverify.clearCode(user);
        user.lastReverifiedAt = new Date();
        await user.save();
      }
    }

    const previousLoginAt = user.lastLoginAt;
    user.lastLoginAt = new Date();
    await user.save();

    // Informational only — never delays or blocks the login response. Staff
    // accounts are provisioned/trusted directly, so this is client-only.
    if (user.role === 'client') {
      const staleMs = STALE_LOGIN_DAYS * 24 * 60 * 60 * 1000;
      const isStaleLogin = !previousLoginAt || (Date.now() - previousLoginAt.getTime()) > staleMs;
      if (isStaleLogin) {
        sendNewSignInAlertEmail(user.email, user.name).catch((err) => {
          console.error('⚠  New sign-in alert email failed to send:', err.message);
        });
      }
    }

    res.status(200).json({ token: issueSession(res, user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/verify-login
// Second half of a sign-in that was challenged: the code from the email is
// exchanged for the session the password alone no longer granted.
const verifyLogin = async (req, res) => {
  try {
    const { email, role, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const user = await User.findOne(role
      ? { email: String(email).toLowerCase(), role }
      : { email: String(email).toLowerCase() });
    // Deliberately the same message a wrong code gets: which addresses have
    // accounts is not something an unauthenticated caller should be able to
    // map out by trying them.
    if (!user) return res.status(401).json({ error: 'That code is not right.' });

    const result = reverify.verifyCode(user, code);
    await user.save();
    if (!result.ok) return res.status(401).json({ error: result.error });

    user.lastLoginAt = new Date();
    await user.save();
    res.status(200).json({ token: issueSession(res, user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/verify-email/:token
const verifyEmail = async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user   = await User.findOne({
      emailVerificationToken:   hashed,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ error: 'Verification link is invalid or has expired.' });

    user.isEmailVerified          = true;
    user.emailVerificationToken   = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully.',
      token:   issueSession(res, user),
      user:    safeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(400).json({ error: 'No account found with that email.' });
    if (user.isEmailVerified)
      return res.status(400).json({ error: 'This email is already verified.' });

    const token = user.createEmailVerificationToken();
    await user.save();
    const resendResult = await sendVerificationEmail(user.email, user.name, token);

    res.status(200).json({
      message: 'Verification email resent.',
      emailPreviewUrl: resendResult?.previewUrl || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // Always return the same response to avoid user enumeration
    const generic = { message: 'If that email is registered, a reset link has been sent.' };

    if (!email) return res.status(200).json(generic);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json(generic);

    const token = user.createPasswordResetToken();
    await user.save();

    let resetPreviewUrl = null;
    try {
      const result = await sendPasswordResetEmail(user.email, user.name, token);
      resetPreviewUrl = result?.previewUrl || null;
    } catch (emailErr) {
      console.error('⚠  Reset email failed to send:', emailErr.message);
    }

    res.status(200).json({ ...generic, emailPreviewUrl: resetPreviewUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user   = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Password reset successful.',
      token:   issueSession(res, user),
      user:    safeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  logout,
  register, login, getMe,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  verifyLogin,
};
