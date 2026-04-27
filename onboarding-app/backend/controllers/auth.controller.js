const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Client = require('../models/Client');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    SECRET,
    { expiresIn: '8h' }
  );
}

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ error: 'An account with that email already exists.' });

    const allowedRoles = ['compliance', 'rm', 'client'];
    const user = new User({
      name,
      email,
      password,
      role: allowedRoles.includes(role) ? role : 'client',
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    if (user.role === 'client') {
      const clientId = await Client.generateClientId();
      await Client.create({
        clientId,
        userId: user._id,
        email:  user.email,
        name:   user.name,
        status: 'pending',
      });
    }

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr) {
      console.error('⚠  Verification email failed to send:', emailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      email:   user.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

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
    await sendVerificationEmail(user.email, user.name, token);

    res.status(200).json({ message: 'Verification email resent.' });
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

    try {
      await sendPasswordResetEmail(user.email, user.name, token);
    } catch (emailErr) {
      console.error('⚠  Reset email failed to send:', emailErr.message);
    }

    res.status(200).json(generic);
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
