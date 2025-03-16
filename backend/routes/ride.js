const express = require("express");
const router = express.Router();
const rideController = require("../controller/ride");
const { isAuthenticated } = require("../middleware/auth");

// Apply authentication middleware to all profile routes
router.use(isAuthenticated);

router.post("/create", rideController.createRide);

router.get("/", rideController.getRides);

// Driver canceling entire ride or hitcher canceling their request
router.post("/cancel", rideController.cancelRide);

router.post("/request", rideController.requestRide);

router.post("/accept", rideController.acceptRide);

router.post("/reject", rideController.rejectRide);

// Mark notification as read
router.post("/notifications/read", rideController.markNotificationAsRead);

module.exports = router;
