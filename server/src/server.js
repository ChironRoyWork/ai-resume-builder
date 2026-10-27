require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const generateRoutes = require("./routes/generateRoutes");
const savedVersionRoutes = require("./routes/savedVersionRoutes");


const app = express();




app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN ||
      "http://localhost:5173",
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/versions", savedVersionRoutes);

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


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});