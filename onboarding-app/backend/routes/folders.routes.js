const express = require("express");
const router = express.Router();
const controller = require("../controllers/folders.controller");

router.get("/", controller.getFolders);
router.get("/type/:type", controller.getFoldersByType);

module.exports = router;