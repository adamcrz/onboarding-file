const express = require("express");
const { postCreateFolder } = require("./controllers/folders.controller");

const router = express.Router();

router.post("/", postCreateFolder);

module.exports = router;