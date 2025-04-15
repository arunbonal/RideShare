const express = require("express");
const router = express.Router();
const rideController = require("../controller/ride");
const authMiddleware = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authMiddleware.isAuthenticated);

router.post("/create", rideController.createRide);

router.get("/", rideController.getRides);

// Driver canceling entire ride or hitcher canceling their request
router.post("/cancel", rideController.cancelRide);

router.post("/request", rideController.requestRide);

router.post("/accept", rideController.acceptRide);

router.post("/reject", rideController.rejectRide);

// Mark notification as read
router.post("/notifications/read", rideController.markNotificationAsRead);

// Update ride status (in-progress, completed)
router.post("/update-status", rideController.updateRideStatus);

router.post("/calculate-reliability-impact", rideController.calculateReliabilityImpact);

// Get the status of a specific ride
router.get("/:rideId/status", rideController.getRideStatus);

// Get the status of a specific hitcher in a ride
router.get("/:rideId/hitcher/:hitcherId/status", rideController.getHitcherStatus);

// Get a specific ride by ID
router.get("/:rideId", rideController.getRideById);

// Update a ride
router.put("/:rideId", rideController.updateRide);

module.exports = router;
