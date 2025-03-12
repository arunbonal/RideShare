const express = require("express");
const router = express.Router();
const rideController = require("../controller/ride");
const { isAuthenticated } = require("../middleware/auth");

// Apply authentication middleware to all profile routes
router.use(isAuthenticated);

router.post("/create", rideController.createRide);

router.get("/", rideController.getRides);

router.delete("/:id", rideController.deleteRide);

router.post("/:id/request", rideController.requestRide);

router.post("/:rideId/:hitcherId/accept", rideController.acceptRide);

router.post("/:rideId/:hitcherId/reject", rideController.rejectRide);

module.exports = router;
