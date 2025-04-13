const express = require("express");
const router = express.Router();
const profileController = require("../controller/profile");
const authMiddleware = require("../middleware/auth");
const { cache, invalidateCache } = require("../middleware/cache");

// Get user profile - cached for 1 hour
router.get("/:userId", cache(3600), async (req, res) => {
  // ... existing code ...
});

// Update user profile - invalidate cache after update
router.put("/:userId", invalidateCache("cache:/api/profile/*"), async (req, res) => {
  // ... existing code ...
});

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
router.post(
  "/driver/update",
  authMiddleware.isAuthenticated,
  profileController.updateDriverVehicleAndPricing || profileController.updateDriverProfile
);

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
  profileController.updateBasicProfileInfo
);

module.exports = router;
