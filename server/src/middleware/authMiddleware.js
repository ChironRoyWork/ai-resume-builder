const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (typeof authHeader !== "string" || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return res.status(401).json({
      message: "Authentication token required",
      code: "AUTH_REQUIRED"
    });
  }

  const token = authHeader.trim().split(/\s+/)[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication token required"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded || typeof decoded !== "object" ||
        !["string", "number"].includes(typeof decoded.userId) ||
        !/^[1-9]\d*$/.test(String(decoded.userId))) {
      return res.status(401).json({ message: "Invalid or expired token", code: "AUTH_INVALID" });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
      code: error.name === "TokenExpiredError" ? "AUTH_EXPIRED" : "AUTH_INVALID"
    });
  }
};

module.exports = authenticateToken;
