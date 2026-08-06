const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notifications.controller');

router.get('/',              ctrl.listNotifications);
router.post('/:id/read',     ctrl.markRead);
router.post('/read-all',     ctrl.markAllRead);

module.exports = router;
