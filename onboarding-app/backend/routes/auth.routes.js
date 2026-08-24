const express = require('express');
const router  = express.Router();
const {
  register, login, logout, getMe,
  verifyEmail, resendVerification, verifyLogin,
  forgotPassword, resetPassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter, accountLimiter } = require('../config/security');

// Public self-registration is closed. Every account here is provisioned
// deliberately — staff through scripts/createAccount.js, clients through the
// invitation the Contract Builder sends — so an open sign-up creates accounts
// nobody asked for on a system holding client records. Set
// ALLOW_PUBLIC_REGISTRATION=true to reopen it if self-service is ever wanted.
const PUBLIC_REGISTRATION = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

// Sign-in and anything that sends mail to a caller-supplied address are the
// endpoints worth guessing at, so they carry their own tighter caps.
if (PUBLIC_REGISTRATION) {
  router.post('/register',            accountLimiter, register);
} else {
  router.post('/register', (_req, res) => res.status(403).json({
    error: 'Accounts are created by Compliance. Ask them to set one up for you.',
  }));
}
router.post('/login',                 loginLimiter,   login);
// Second half of a challenged sign-in. Under the same cap as the password
// step: a six-digit code is worth guessing at if the guessing is free.
router.post('/verify-login',          loginLimiter,   verifyLogin);
router.post('/logout',                logout);
router.get ('/verify-email/:token',   verifyEmail);
router.post('/resend-verification',   accountLimiter, resendVerification);
router.post('/forgot-password',       accountLimiter, forgotPassword);
router.post('/reset-password/:token', accountLimiter, resetPassword);
router.get ('/me',                    protect, getMe);

module.exports = router;
