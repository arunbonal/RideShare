require("dotenv").config();
const jwt = require('jsonwebtoken');
const { invalidateUserProfileCache } = require('../utils/cacheUtils');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

exports.googleCallback = (req, res) => {
  // authentication failed
  if (!req.user) {
    console.error("Authentication failed: No user found");
    return res.redirect(`${process.env.CLIENT_URL}/?error=invalid-email`);
  }

  // Check if email is from PES domain for non-admin users
  if (!req.user.isAdmin && !req.user.email?.endsWith("@pesu.pes.edu")) {
    req.logout((err) => {
      if (err) {
        console.error("Error logging out:", err);
      }
      res.redirect(`${process.env.CLIENT_URL}/?error=invalid-email`);
    });
    return;
  }

  // Generate JWT token
  const token = generateToken(req.user);

  // Redirect back to frontend with the token
  return res.redirect(`${process.env.CLIENT_URL}/auth/google/callback?token=${token}`);
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
};

// understand from here
exports.updateActiveRoles = async (req, res) => {
  try {
    // User is already authenticated by the middleware
    const { driver, hitcher } = req.body;

    // Validate input
    if (typeof driver !== "boolean" && typeof hitcher !== "boolean") {
      return res.status(400).json({ message: "Invalid role settings" });
    }

    // Update active roles
    if (typeof driver === "boolean") {
      req.user.activeRoles.driver = driver;
    }

    if (typeof hitcher === "boolean") {
      req.user.activeRoles.hitcher = hitcher;
    }

    await req.user.save();
    
    // Invalidate the user's profile cache
    await invalidateUserProfileCache(req.user._id);

    res.json({
      message: "Active roles updated successfully",
      activeRoles: req.user.activeRoles,
    });
  } catch (err) {
    console.error("Error updating active roles:", err);
    res.status(500).json({ message: "Error updating active roles", error: err.message });
  }
};

exports.updateDriverProfileComplete = async (req, res) => {
  try {
    // User is already authenticated by the middleware
    const { complete } = req.body;

    if (typeof complete !== "boolean") {
      return res.status(400).json({ message: "Invalid profile complete status" });
    }

    req.user.driverProfileComplete = complete;
    await req.user.save();
    
    // Invalidate the user's profile cache
    await invalidateUserProfileCache(req.user._id);

    res.json({
      message: "Driver profile status updated successfully",
      driverProfileComplete: complete,
    });
  } catch (err) {
    console.error("Error updating profile status:", err);
    res.status(500).json({ message: "Error updating profile status", error: err.message });
  }
};

exports.updateHitcherProfileComplete = async (req, res) => {
  try {
    // User is already authenticated by the middleware
    const { complete } = req.body;

    if (typeof complete !== "boolean") {
      return res.status(400).json({ message: "Invalid profile complete status" });
    }

    req.user.hitcherProfileComplete = complete;
    await req.user.save();
    
    // Invalidate the user's profile cache
    await invalidateUserProfileCache(req.user._id);

    res.json({
      message: "Hitcher profile status updated successfully",
      hitcherProfileComplete: complete,
    });
  } catch (err) {
    console.error("Error updating profile status:", err);
    res.status(500).json({ message: "Error updating profile status", error: err.message });
  }
};
