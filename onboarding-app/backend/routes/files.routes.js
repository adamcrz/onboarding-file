const express = require("express");
const router = express.Router();
const controller = require("../controllers/files.controller");

router.get("/:mandateId", controller.getFilesByMandate);
router.get("/:mandateId/grouped", controller.getFilesGrouped);
router.post("/upload", controller.uploadFile);

module.exports = router;