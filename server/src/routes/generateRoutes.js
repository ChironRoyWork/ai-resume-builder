const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticateToken, (req, res) => {
  res.json({
    message: "Generate route is working",
    user: req.user
  });
});

module.exports = router;