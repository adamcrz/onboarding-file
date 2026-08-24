const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/documentRequirements.controller');
const { protect } = require('../middleware/auth.middleware');

// The per-legal-form checklist is the firm's own onboarding policy, not public
// reference material, and it is only ever read from inside the app.
router.get('/', protect, getAll);

module.exports = router;
