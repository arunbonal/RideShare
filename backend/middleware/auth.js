const jwt = require("jsonwebtoken");

// Authentication middleware
exports.isAuthenticated = (req, res, next) => {
  // Check if user is authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // If not authenticated, return 401 Unauthorized
  res.status(401).json({ message: "Unauthorized. Please log in." });
};

// JWT Token authentication middleware
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Admin authorization middleware
exports.isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
