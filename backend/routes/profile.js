const express = require("express");
const router = express.Router();
const profileController = require("../controller/profile");
const { isAuthenticated } = require("../middleware/auth");

// Apply authentication middleware to all profile routes
router.use(isAuthenticated);

// Get user profile
router.get("/", profileController.getUserProfile);

// Update driver profile
router.post("/driver", profileController.updateDriverProfile);

// Update driver vehicle and pricing only
router.post("/driver/update", profileController.updateDriverVehicleAndPricing);

// Update hitcher profile
router.post("/hitcher", profileController.updateHitcherProfile);

// Generic profile update route for basic info like phone and address
router.post("/update", profileController.updateBasicProfileInfo);

module.exports = router;
