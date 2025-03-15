const User = require("../models/User");
const { getCompleteUserData } = require("../utils/userUtils");

// Update driver profile
exports.updateDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, homeAddress, driverProfile, gender, distanceToCollege } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's phone and address if provided
    if (phone) user.phone = phone;
    if (homeAddress) user.homeAddress = homeAddress;
    if (gender) user.gender = gender;
    if (distanceToCollege) user.distanceToCollege = distanceToCollege;
    // Update or create driver profile
    user.driverProfile = {
      isActive: true,
      licenseImage: driverProfile.licenseImage,
      vehicle: {
        model: driverProfile.vehicle.model,
        color: driverProfile.vehicle.color,
        registrationNumber: driverProfile.vehicle.registrationNumber,
        seats: driverProfile.vehicle.seats,
      },
      pricePerKm: driverProfile.pricePerKm,
      completedTripsAsDriver: user.driverProfile?.completedTripsAsDriver || 0,
      rating: user.driverProfile?.rating || 0,
      ratingCount: user.driverProfile?.ratingCount || 0,
    };

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "Driver profile updated successfully",
      driverProfile: user.driverProfile,
    });
  } catch (error) {
    console.error("Error updating driver profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update hitcher profile\
exports.updateHitcherProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, homeAddress, gender, distanceToCollege } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's phone and address if provided
    if (phone) user.phone = phone;
    if (homeAddress) user.homeAddress = homeAddress;
    if (gender) user.gender = gender;
    if (distanceToCollege) user.distanceToCollege = distanceToCollege;
    // Update or create hitcher profile - simplified
    user.hitcherProfile = {
      isActive: true,
      completedTripsAsHitcher:
        user.hitcherProfile?.completedTripsAsHitcher || 0,
      rating: user.hitcherProfile?.rating || 0,
      ratingCount: user.hitcherProfile?.ratingCount || 0,
    };

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "Hitcher profile updated successfully",
      hitcherProfile: user.hitcherProfile,
    });
  } catch (error) {
    console.error("Error updating hitcher profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const userData = await getCompleteUserData(req.user._id);
    res.json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
