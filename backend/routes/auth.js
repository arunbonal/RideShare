const express = require("express");
const passport = require("passport");
const router = express.Router();
const authController = require("../controller/auth");
const authMiddleware = require("../middleware/auth");
require("dotenv").config();

// Google OAuth login route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL}/?error=invalid-email`,
    session: true,
  }),
  authController.googleCallback
);

// Logout route
router.get("/logout", authController.logout);

// Update active roles
router.put(
  "/active-roles",
  authMiddleware.isAuthenticated,
  authController.updateActiveRoles
);

// Update driver profile completion status
router.put(
  "/driver-profile-complete",
  authMiddleware.isAuthenticated,
  authController.updateDriverProfileComplete
);

// Update hitcher profile completion status
router.put(
  "/hitcher-profile-complete",
  authMiddleware.isAuthenticated,
  authController.updateHitcherProfileComplete
);

module.exports = router;
