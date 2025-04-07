const jwt = require("jsonwebtoken");
const User = require('../models/User');
require('dotenv').config();

// Middleware to check if user is authenticated (via session OR token)
exports.isAuthenticated = async (req, res, next) => {
  // First check if user is authenticated via session
  if (req.isAuthenticated()) {
    return next();
  }

  // If not authenticated via session, check for token
  try {
    // Get token from header or query parameter
    const token = 
      req.headers.authorization?.split(' ')[1] || // Bearer TOKEN format
      req.query.token; // Token as query parameter
    
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
};

// Middleware to check if user is an admin
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }
  
  next();
};
