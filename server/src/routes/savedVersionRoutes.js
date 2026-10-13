const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  saveVersion,
  getSavedVersions
} = require("../controllers/savedVersionController");

const router = express.Router();

router.post("/", authenticateToken, saveVersion);
router.get("/", authenticateToken, getSavedVersions);

module.exports = router;