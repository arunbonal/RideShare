const Ride = require("../models/Ride");

exports.createRide = async (req, res) => {
  try {
    const newRide = new Ride(req.body);
    const savedRide = await newRide.save();
    res
      .status(200)
      .json({ message: "Ride created successfully", ride: savedRide });
  } catch (err) {
    console.error("Error creating ride:", err);
    res.status(500).json({
      message: "Error creating ride",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("driver", "name email phone gender")
      .populate("hitchers.user", "name email phone")
      .sort({ date: 1 }); // Sort by date in ascending order
    res.status(200).json({ message: "Rides fetched successfully", rides });
  } catch (err) {
    console.error("Error fetching rides:", err);
    res.status(500).json({
      message: "Error fetching rides",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.deleteRide = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRide = await Ride.findByIdAndDelete(id);
    if (!deletedRide) {
      return res.status(404).json({ message: "Ride not found" });
    }
    res.status(200).json({ message: "Ride deleted successfully" });
  } catch (err) {
    console.error("Error deleting ride:", err);
    res.status(500).json({
      message: "Error deleting ride",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.requestRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, pickupLocation, dropoffLocation, fare, status } = req.body;

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check if the hitcher is already in the ride
    const existingRequest = ride.hitchers.find(
      (h) => h.user && h.user.equals(user)
    );
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You have already requested this ride" });
    }

    // Add the hitcher request to the ride
    ride.hitchers.push({
      user,
      status: status || "pending",
      pickupLocation,
      dropoffLocation,
      fare,
      requestTime: new Date(),
    });

    await ride.save();
    res.status(200).json({ message: "Ride request sent successfully" });
  } catch (err) {
    console.error("Error requesting ride:", err);
    res.status(500).json({
      message: "Error requesting ride",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const { rideId, hitcherId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const hitcher = ride.hitchers.find((h) => h.user.equals(hitcherId));
    if (!hitcher) {
      return res.status(404).json({ message: "Hitcher not found" });
    }

    hitcher.status = "accepted";

    // Update available seats
    if (ride.availableSeats > 0 && hitcher.status === "accepted") {
      ride.availableSeats -= 1;
    }

    await ride.save();
    res.status(200).json({ message: "Ride accepted successfully" });
  } catch (err) {
    console.error("Error accepting ride:", err);
    res.status(500).json({
      message: "Error accepting ride",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.rejectRide = async (req, res) => {
  try {
    const { rideId, hitcherId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const hitcher = ride.hitchers.find((h) => h.user.equals(hitcherId));
    if (!hitcher) {
      return res.status(404).json({ message: "Hitcher not found" });
    }

    hitcher.status = "rejected";
    await ride.save();
    res.status(200).json({ message: "Ride rejected successfully" });
  } catch (err) {
    console.error("Error declining ride:", err);
    res.status(500).json({
      message: "Error declining ride",
      error: err.message || "Unknown error occurred",
    });
  }
};
