const express = require("express");
const { getFiles } = require("./controllers/files.controller");

const router = express.Router();

router.get("/", getFiles);

module.exports = router;