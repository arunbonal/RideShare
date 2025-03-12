// Authentication middleware
exports.isAuthenticated = (req, res, next) => {
  // Check if user is authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // If not authenticated, return 401 Unauthorized
  res.status(401).json({ message: "Unauthorized. Please log in." });
};
