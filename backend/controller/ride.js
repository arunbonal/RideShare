const Ride = require("../models/Ride");
const User = require("../models/User");

exports.createRide = async (req, res) => {
  try {
    const newRide = new Ride(req.body);
    const savedRide = await newRide.save();

    // Update driver reliability metrics
    await User.updateDriverReliability(savedRide.driver, 'RIDE_CREATED');

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
      .populate("driver", "name email phone gender srn driverProfile.vehicle.model driverProfile.vehicle.color driverProfile.vehicle.registrationNumber driverProfile.reliabilityRate")
      .populate("hitchers.user", "name email phone gender srn hitcherProfile.rating hitcherProfile.reliabilityRate")
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

exports.cancelRide = async (req, res) => {
  try {
    const { rideId, hitcherId } = req.body;
    
    // Find the ride
    const ride = await Ride.findById(rideId).populate('driver', 'name').populate('hitchers.user', 'name');
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // If hitcherId is provided, it's a hitcher canceling their request
    if (hitcherId) {
      const hitcher = ride.hitchers.find(h => h.user && h.user._id.toString() === hitcherId);
      if (!hitcher) {
        return res.status(404).json({ success: false, message: 'Hitcher not found in this ride' });
      }
      
      // Store the previous status to check if we need to update seats and fare
      const previousStatus = hitcher.status;
      
      // Update hitcher status to cancelled
      hitcher.status = 'cancelled';
      
      // If hitcher was accepted, increment available seats and update total fare
      if (previousStatus === 'accepted') {
        ride.availableSeats += 1;
        
        // Recalculate total fare by subtracting this hitcher's fare
        const hitcherFare = hitcher.fare || 0;
        ride.totalFare = Math.max(0, (ride.totalFare || 0) - hitcherFare);
        
        // Add a notification for the driver
        if (!ride.notifications) {
          ride.notifications = [];
        }
        
        ride.notifications.push({
          userId: ride.driver._id,
          message: `${hitcher.user.name} has cancelled their ride`,
          read: false,
          createdAt: new Date()
        });

        // Update hitcher reliability - they cancelled an accepted ride
        await User.updateHitcherReliability(hitcherId, 'CANCEL_ACCEPTED_RIDE');
      } else {
        // Hitcher cancelled a pending ride - no reliability penalty
        await User.updateHitcherReliability(hitcherId, 'CANCEL_PENDING_RIDE');
      }
    } else {
      // Driver is canceling the entire ride
      ride.status = 'cancelled';

      // Check if there are any accepted hitchers
      const hasAcceptedHitchers = ride.hitchers && ride.hitchers.some(h => h.status === 'accepted');
      
      // Update driver reliability based on whether there were accepted hitchers
      if (hasAcceptedHitchers) {
        await User.updateDriverReliability(ride.driver._id, 'CANCEL_ACCEPTED_RIDE');
      } else {
        await User.updateDriverReliability(ride.driver._id, 'CANCEL_NON_ACCEPTED_RIDE');
      }

      // Update all pending and accepted hitchers to cancelled-by-driver
      if (ride.hitchers && ride.hitchers.length > 0) {
        ride.hitchers = ride.hitchers.map(hitcher => {
          if (hitcher.status === 'pending' || hitcher.status === 'accepted') {
            return {
              ...hitcher.toObject(),
              status: 'cancelled-by-driver'
            };
          }
          return hitcher;
        });
      }
    }

    // Save the updated ride
    const updatedRide = await ride.save();

    if (!updatedRide) {
      return res.status(500).json({ success: false, message: 'Failed to update ride' });
    }

    // Return the updated user data
    res.json({ 
      success: true, 
      message: hitcherId ? 'Ride request cancelled successfully' : 'Ride cancelled successfully',
      ride: updatedRide,
      user: {
        id: updatedRide.driver._id,
        hitcherProfile: updatedRide.driver.hitcherProfile,
        driverProfile: updatedRide.driver.driverProfile
      }
    });

  } catch (error) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({ success: false, message: 'Error cancelling ride' });
  }
};

exports.requestRide = async (req, res) => {
  try {
    const { rideId, user, pickupLocation, dropoffLocation, fare, status, gender } = req.body;

    const ride = await Ride.findById(rideId);
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

    // Get the user's information to include gender
    const hitcherUser = await User.findById(user);
    if (!hitcherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add the hitcher request to the ride
    ride.hitchers.push({
      user,
      status: status || "pending",
      pickupLocation,
      dropoffLocation,
      fare,
      requestTime: new Date(),
      gender: gender || hitcherUser.gender // Use provided gender or get from user
    });

    // Update hitcher reliability
    await User.updateHitcherReliability(user, 'RIDE_REQUESTED');

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
    const { rideId, hitcherId } = req.body;

    const ride = await Ride.findById(rideId).populate('hitchers.user');
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Find and update the hitcher's status
    const hitcher = ride.hitchers.find(
      (h) => h.user && h.user._id.toString() === hitcherId
    );
    
    if (!hitcher) {
      return res.status(404).json({ message: "Hitcher not found in this ride" });
    }

    // Check if the hitcher has already cancelled their request
    if (hitcher.status === "cancelled") {
      return res.status(400).json({ 
        message: "Cannot accept this request as the hitcher has already cancelled it",
        alreadyCancelled: true
      });
    }

    hitcher.status = "accepted";
    
    // Calculate total fare from all accepted hitchers
    const totalFare = ride.hitchers.reduce((sum, h) => {
      return h.status === "accepted" ? sum + (h.fare || 0) : sum;
    }, 0);

    // Add the new hitcher's fare
    ride.totalFare = totalFare;

    // Update available seats
    ride.availableSeats = Math.max(0, ride.availableSeats - 1);

    await ride.save();
    res.status(200).json({ message: "Ride request accepted successfully" });
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
    const { rideId, hitcherId } = req.body;

    const ride = await Ride.findById(rideId).populate('hitchers.user', 'name');
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const hitcher = ride.hitchers.find((h) => h.user && h.user._id.toString() === hitcherId);
    if (!hitcher) {
      return res.status(404).json({ message: "Hitcher not found" });
    }

    // Store the hitcher's name for notification
    const hitcherName = hitcher.user.name;

    // Update hitcher status to rejected
    hitcher.status = "rejected";
    
    // Add notification for the hitcher
    if (!ride.notifications) {
      ride.notifications = [];
    }
    
    ride.notifications.push({
      userId: hitcherId,
      message: `Your ride request has been rejected by the driver`,
      read: false,
      createdAt: new Date()
    });

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

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { rideId, notificationId } = req.body;
    
    // Find the ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Find and update the notification
    const notification = ride.notifications?.find(n => n._id.toString() === notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Mark as read
    notification.read = true;
    
    // Save the updated ride
    await ride.save();

    res.json({ 
      success: true, 
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const { rideId, status } = req.body;
    
    if (!['scheduled', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: scheduled, in-progress, completed, cancelled' 
      });
    }
    
    // Find and update the ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    
    // Only allow specific transitions:
    // scheduled -> in-progress, scheduled -> completed, scheduled -> cancelled
    // in-progress -> completed, in-progress -> cancelled
    const validTransition = 
      (ride.status === 'scheduled' && ['in-progress', 'completed', 'cancelled'].includes(status)) ||
      (ride.status === 'in-progress' && ['completed', 'cancelled'].includes(status)) ||
      (ride.status === status); // Allow setting to same status (idempotent)
    
    if (!validTransition) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${ride.status} to ${status}`
      });
    }
    
    ride.status = status;
    
    // If the ride is completed, update reliability metrics for driver and all accepted hitchers
    if (status === 'completed') {
      // Update driver completion metrics
      await User.updateDriverReliability(ride.driver, 'RIDE_COMPLETED');
      
      // Update all accepted hitchers' completion metrics
      if (ride.hitchers && ride.hitchers.length > 0) {
        const acceptedHitchers = ride.hitchers.filter(h => h.status === 'accepted');
        for (const hitcher of acceptedHitchers) {
          await User.updateHitcherReliability(hitcher.user, 'RIDE_COMPLETED');
        }
      }
    } else if (status === 'cancelled') {
      // Handle cancellation reliability similar to cancelRide function
      const hasAcceptedHitchers = ride.hitchers && ride.hitchers.some(h => h.status === 'accepted');
      
      if (hasAcceptedHitchers) {
        await User.updateDriverReliability(ride.driver, 'CANCEL_ACCEPTED_RIDE');
      } else {
        await User.updateDriverReliability(ride.driver, 'CANCEL_NON_ACCEPTED_RIDE');
      }
    }
    
    await ride.save();
    
    res.json({ 
      success: true, 
      message: `Ride status updated to ${status}`,
      ride
    });
    
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({ success: false, message: 'Error updating ride status' });
  }
};

exports.calculateReliabilityImpact = async (req, res) => {
  try {
    const { userId, userType } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let currentRate, newRate;
    
    if (userType === 'driver' && user.driverProfile) {
      currentRate = user.driverProfile.reliabilityRate;
      // Calculate penalty similar to CANCEL_ACCEPTED_RIDE in UserSchema
      const acceptedPenalty = Math.min(10, 100 / (user.driverProfile.totalRidesCreated || 1) * 20);
      newRate = Math.max(0, currentRate - acceptedPenalty);
    } 
    else if (userType === 'hitcher' && user.hitcherProfile) {
      currentRate = user.hitcherProfile.reliabilityRate;
      const acceptedPenalty = Math.min(10, 100 / (user.hitcherProfile.totalRidesRequested || 1) * 20);
      newRate = Math.max(0, currentRate - acceptedPenalty);
    } 
    else {
      return res.status(400).json({ error: 'Invalid user type or profile' });
    }
    
    res.json({ currentRate, newRate });
  } catch (error) {
    console.error("Error calculating reliability impact:", error);
    res.status(500).json({ error: 'Server error' });
  }
};