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

// Update hitcher profile
router.post("/hitcher", profileController.updateHitcherProfile);

module.exports = router;
