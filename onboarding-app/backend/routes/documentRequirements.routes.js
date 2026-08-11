const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/documentRequirements.controller');

router.get('/', getAll);

module.exports = router;
