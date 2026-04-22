const express = require('express');
const router  = express.Router();
const {
  register, login, getMe,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register',              register);
router.post('/login',                 login);
router.get ('/verify-email/:token',   verifyEmail);
router.post('/resend-verification',   resendVerification);
router.post('/forgot-password',       forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get ('/me',                    protect, getMe);

module.exports = router;
