const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Client = require('../models/Client');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const { syncKycCorrectionsForClient } = require('../services/kycGapCheck.service');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name, rmCode: user.rmCode || null },
    SECRET,
    { expiresIn: '8h' }
  );
}

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, rmCode: user.rmCode || null };
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, rmCode } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    // Which portal (role) the account is created for is decided by which
    // portal card the user picked on the login screen before reaching this
    // form, not a raw dropdown — but the value still arrives here as a plain
    // field, so it's validated against the allowed set the same way.
    // Uniqueness is scoped per role, so this email may already have an
    // account under a different role category without blocking this one.
    const allowedRoles = ['compliance', 'compliance_external', 'rm', 'client'];
    const resolvedRole = allowedRoles.includes(role) ? role : 'client';

    const existing = await User.findOne({ email: email.toLowerCase(), role: resolvedRole });
    if (existing)
      return res.status(400).json({ error: 'An account with that email already exists.' });

    const user = new User({
      name, email, password, role: resolvedRole,
      rmCode: resolvedRole === 'rm' && rmCode ? String(rmCode).trim().toUpperCase() : undefined,
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    if (user.role === 'client') {
      const clientId = await Client.generateClientId();
      const client = await Client.create({
        clientId,
        userId: user._id,
        email:  user.email,
        name:   user.name,
        status: 'pending',
      });
      await syncKycCorrectionsForClient(client);
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

    res.status(200).json({ token: signToken(user), user: safeUser(user) });
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
      token:   signToken(user),
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
      token:   signToken(user),
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
  register, login, getMe,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
};
