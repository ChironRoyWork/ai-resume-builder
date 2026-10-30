require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const generateRoutes = require("./routes/generateRoutes");
const savedVersionRoutes = require("./routes/savedVersionRoutes");
const interviewSessionRoutes = require("./routes/interviewSessionRoutes");


const app = express();




app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN ||
      "http://localhost:5173",
  })
);

// Two 25,000-character fields can exceed 100 KB when they contain Unicode.
app.use(express.json({ limit: "512kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/versions", savedVersionRoutes);
app.use("/api/interview-sessions", interviewSessionRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server connected!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      databaseTime: result.rows[0].now
    });
  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed"
    });
  }
});


app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request is too large. Shorten the submitted text." });
  }
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body must be valid JSON." });
  }
  return next(error);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
