const express = require("express");
const {
  saveProfile,
  getProfile
} = require("../controllers/profileController");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateToken, getProfile);
router.put("/", authenticateToken, saveProfile);

module.exports = router;