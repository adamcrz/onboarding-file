const express = require('express');
const router  = express.Router();
const {
  register, login, logout, getMe,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter, accountLimiter } = require('../config/security');

// Sign-in and anything that sends mail to a caller-supplied address are the
// endpoints worth guessing at, so they carry their own tighter caps.
router.post('/register',              accountLimiter, register);
router.post('/login',                 loginLimiter,   login);
router.post('/logout',                logout);
router.get ('/verify-email/:token',   verifyEmail);
router.post('/resend-verification',   accountLimiter, resendVerification);
router.post('/forgot-password',       accountLimiter, forgotPassword);
router.post('/reset-password/:token', accountLimiter, resetPassword);
router.get ('/me',                    protect, getMe);

module.exports = router;
