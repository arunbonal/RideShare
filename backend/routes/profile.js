const express = require("express");
const router = express.Router();
const profileController = require("../controller/profile");
const authMiddleware = require("../middleware/auth");

// Get user profile
router.get(
  "/",
  authMiddleware.isAuthenticated,
  profileController.getUserProfile
);

// Update driver profile
router.post(
  "/driver",
  authMiddleware.isAuthenticated,
  profileController.updateDriverProfile
);

// Update driver vehicle and pricing only
router.post("/driver/update", profileController.updateDriverVehicleAndPricing);

// Update hitcher profile
router.post(
  "/hitcher",
  authMiddleware.isAuthenticated,
  profileController.updateHitcherProfile
);

// Update user's address
router.post(
  "/update",
  authMiddleware.isAuthenticated,
  profileController.updateUserProfile
);

module.exports = router;
