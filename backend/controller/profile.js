const User = require("../models/User");
const Ride = require("../models/Ride");
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
    
    // Validate driverProfile data
    if (!driverProfile) {
      return res.status(400).json({ message: "Driver profile data is required" });
    }
    
    if (!driverProfile.vehicle) {
      return res.status(400).json({ message: "Vehicle information is required" });
    }
    
    // Update or create driver profile
    user.driverProfile = {
      isActive: true,
      vehicle: {
        model: driverProfile.vehicle.model || "",
        color: driverProfile.vehicle.color || "",
        registrationNumber: driverProfile.vehicle.registrationNumber || "",
        seats: driverProfile.vehicle.seats || 4,
      },
      pricePerKm: driverProfile.pricePerKm || 0,
      completedTripsAsDriver: user.driverProfile?.completedTripsAsDriver || 0,
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

// Update driver vehicle and pricing
exports.updateDriverVehicleAndPricing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle, pricePerKm } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if driver profile exists
    if (!user.driverProfile) {
      return res.status(400).json({ message: "Driver profile not found" });
    }

    // Update vehicle information
    if (vehicle) {
      user.driverProfile.vehicle = {
        ...user.driverProfile.vehicle,
        ...vehicle
      };
    }

    // Update price per km
    if (pricePerKm !== undefined) {
      user.driverProfile.pricePerKm = pricePerKm;
    }

    // Save the updated user
    await user.save();

    // Return the updated profile
    const updatedUserData = await getCompleteUserData(userId);

    res.status(200).json({
      message: "Vehicle and pricing updated successfully",
      user: updatedUserData
    });
  } catch (error) {
    console.error("Error updating vehicle and pricing:", error);
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

// Update basic profile information (phone, address, etc.)
exports.updateBasicProfileInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, homeAddress, gender, distanceToCollege } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If trying to update address, check for active rides
    if (homeAddress !== undefined && homeAddress !== user.homeAddress) {
      const now = new Date();
      
      // Check if user has active rides as a driver
      const driverActiveRides = await Ride.find({
        'driver': userId,
        'status': { $in: ['scheduled', 'in-progress'] },
        $or: [
          { date: { $gte: now } },  // Future rides
          {                         // Today's rides
            date: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          }
        ]
      });
      
      // Check if user has active rides as a hitcher
      const hitcherActiveRides = await Ride.find({
        'hitchers.user': userId,
        'hitchers.status': { $in: ['accepted', 'pending'] },
        'status': { $in: ['scheduled', 'in-progress'] },
        $or: [
          { date: { $gte: now } },  // Future rides
          {                         // Today's rides
            date: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          }
        ]
      });
      
      // If user has active rides, prevent address change
      if (driverActiveRides.length > 0 || hitcherActiveRides.length > 0) {
        return res.status(403).json({
          message: "Cannot update address while you have active rides scheduled. Please complete or cancel your existing rides before changing your address.",
          hasActiveRides: true,
          driverRides: driverActiveRides.length,
          hitcherRides: hitcherActiveRides.length
        });
      }
    }

    // Update only the provided fields
    if (phone !== undefined) user.phone = phone;
    
    // When address is updated, also update distanceToCollege
    if (homeAddress !== undefined) {
      user.homeAddress = homeAddress;
      
      // If distanceToCollege is provided, update it
      if (distanceToCollege !== undefined) {
        // Update the user's distanceToCollege field
        user.distanceToCollege = distanceToCollege;
        
      }
    } else if (distanceToCollege !== undefined) {
      // Handle case where only distanceToCollege is updated without changing address
      user.distanceToCollege = distanceToCollege;
    }
    
    if (gender !== undefined) user.gender = gender;

    // Save the updated user
    await user.save();

    // Return the updated user data
    const updatedUserData = await getCompleteUserData(userId);

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUserData
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
