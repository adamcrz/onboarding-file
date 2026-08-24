const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl    = require('../controllers/notifications.controller');

// Every route needs the caller's identity: notifications are scoped by role
// and by the RM who owns the mandate, so an unauthenticated read would hand
// out one Kundenberater's queue to anyone who asked.
router.get('/',              protect, ctrl.listNotifications);
router.post('/:id/read',     protect, ctrl.markRead);
router.post('/read-all',     protect, ctrl.markAllRead);

module.exports = router;
