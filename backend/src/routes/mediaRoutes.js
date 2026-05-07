const express = require("express");
const { getImportedMedia } = require("../controllers/mediaController");

const router = express.Router();

router.get(/^\/imported\/(.+)$/, getImportedMedia);

module.exports = router;
