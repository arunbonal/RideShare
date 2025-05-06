const Ride = require("../models/Ride");
const User = require("../models/User");
const { logger } = require("../config/logger");
require("dotenv").config();
const { sendEmailNotification } = require("../utils/email_notifications");

let message = ``;

exports.createRide = async (req, res) => {
  try {
    logger.info('Creating new ride', {
      userId: req.user.id,
      direction: req.body.direction,
      date: req.body.date
    });

    const newRide = new Ride(req.body);
    const savedRide = await newRide.save();

    // Update driver reliability metrics
    await User.updateDriverReliability(savedRide.driver, 'RIDE_CREATED');

    logger.info('Ride created successfully', {
      rideId: savedRide._id,
      driverId: savedRide.driver,
      availableSeats: savedRide.availableSeats
    });

    res
      .status(200)
      .json({ message: "Ride created successfully", ride: savedRide });
  } catch (err) {
    logger.error("Error creating ride", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      message: "Error creating ride",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.getRides = async (req, res) => {
  try {
    logger.info('Fetching rides', {
      filters: {
        date: req.query.date,
        direction: req.query.direction
      },
      userId: req.user?.id
    });

    // Build query based on parameters
    const query = {};
    
    // Add date filter if provided
    if (req.query.date) {
      const startOfDay = new Date(req.query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(req.query.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Add direction filter if provided
    if (req.query.direction) {
      query.direction = req.query.direction;
    }

    const rides = await Ride.find(query)
      .populate("driver", "name email phone gender srn college driverProfile.vehicle.model driverProfile.vehicle.registrationNumber driverProfile.reliabilityRate")
      .populate("hitchers.user", "name email phone gender srn college hitcherProfile.reliabilityRate")
      .sort({ date: 1 }); // Sort by date in ascending order

    logger.info('Rides fetched successfully', {
      count: rides.length,
      filters: query,
      userId: req.user?.id
    });

    res.status(200).json({ message: "Rides fetched successfully", rides });
  } catch (err) {
    logger.error("Error fetching rides", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      query: req.query
    });
    res.status(500).json({
      message: "Error fetching rides",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const { rideId, hitcherId } = req.body;

    // Find the ride first to access driver and hitcher info
    const ride = await Ride.findById(rideId).populate('driver', 'name email').populate('hitchers.user', 'name email');
    if (!ride) {
      logger.warn('Ride not found during cancellation', {
        rideId,
        hitcherId,
        userId: req.user.id
      });
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    
    let driverEmail = ride.driver.email;
    

    logger.info('Attempting to cancel ride', {
      rideId,
      hitcherId,
      userId: req.user.id,
      isCancellingEntireRide: !hitcherId
    });

    // Check if the entire ride is already cancelled
    if (ride.status === 'cancelled' && !hitcherId) {
      return res.status(400).json({ 
        success: false, 
        message: 'This ride is already cancelled',
        alreadyCancelled: true
      });
    }

    // If hitcherId is provided, it's a hitcher canceling their request
    if (hitcherId) {
      const hitcher = ride.hitchers.find(h => h.user && h.user._id.toString() === hitcherId);
      if (!hitcher) {
        return res.status(404).json({ success: false, message: 'Hitcher not found in this ride' });
      }
      
      // Check if the ride is already cancelled by the driver
      if (ride.status === 'cancelled') {
        return res.status(400).json({ 
          success: false, 
          message: 'This ride has already been cancelled by the driver',
          alreadyCancelledByDriver: true
        });
      }
      
      // Check if the hitcher has already cancelled their request
      if (hitcher.status === 'cancelled') {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already cancelled this ride request',
          alreadyCancelled: true
        });
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
          message: `${hitcher.user.name.split(' ')[0]} has cancelled their ride`,
          read: false,
          createdAt: new Date()
        });

        // Update hitcher reliability - they cancelled an accepted ride
        await User.updateHitcherReliability(hitcherId, 'CANCEL_ACCEPTED_RIDE');

        message = `${hitcher.user.name.split(' ')[0]} has cancelled their ride (their rating will be negatively impacted), visit ${process.env.CLIENT_URL} for details`;
        
        sendEmailNotification({message, email : driverEmail});

      } else {
        // Hitcher cancelled a pending ride - no reliability penalty
        await User.updateHitcherReliability(hitcherId, 'CANCEL_PENDING_RIDE');
      }
      
      
    } else {
      // Driver is canceling the entire ride
      
      // Check if the ride is already cancelled
      if (ride.status === 'cancelled') {
        return res.status(400).json({ 
          success: false, 
          message: 'This ride is already cancelled',
          alreadyCancelled: true
        });
      }
      
      ride.status = 'cancelled';

      // Check if there are any accepted hitchers
      const hasAcceptedHitchers = ride.hitchers && ride.hitchers.some(h => h.status === 'accepted');

      
      
      // Update driver reliability based on whether there were accepted hitchers
      if (hasAcceptedHitchers) {
        await User.updateDriverReliability(ride.driver._id, 'CANCEL_ACCEPTED_RIDE');

        const hitcherEmails = ride.hitchers.filter(h => h.status === 'accepted').map(h => h.user.email);
        
        message = `${ride.driver.name.split(' ')[0]} has cancelled their ride (their rating will be negatively impacted), visit ${process.env.CLIENT_URL} for details`;

        sendEmailNotification({message, email : hitcherEmails.join(',')});
      } else {
        await User.updateDriverReliability(ride.driver._id, 'CANCEL_NON_ACCEPTED_RIDE');
        const hitcherEmails = ride.hitchers.filter(h => h.status === 'pending').map(h => h.user.email);
        message = `${ride.driver.name.split(' ')[0]} has cancelled their ride. Don't worry, you can always find and book another ride, visit ${process.env.CLIENT_URL}`
        sendEmailNotification({message, email : hitcherEmails.join(',')})
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
        
        // Add notifications for all affected hitchers
        if (!ride.notifications) {
          ride.notifications = [];
        }
        
        ride.hitchers.forEach(hitcher => {
          if (hitcher.status === 'cancelled-by-driver') {
            ride.notifications.push({
              userId: hitcher.user._id,
              message: `Your ride has been cancelled by the driver`,
              read: false,
              createdAt: new Date()
            });
          }
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
    logger.error('Error cancelling ride', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ success: false, message: 'Error cancelling ride' });
  }
};

exports.requestRide = async (req, res) => {
  try {
    const { rideId, user, pickupLocation, dropoffLocation, fare, status, gender } = req.body;

    const ride = await Ride.findById(rideId).populate('driver', 'college email').populate('hitchers.user', 'name');

    const driverEmail = ride.driver.email;
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

    // Get the user's information to include gender and check campus
    const hitcherUser = await User.findById(user);
    if (!hitcherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Make sure the driver and hitcher are from the same campus
    if (ride.driver.college !== hitcherUser.college) {
      return res.status(400).json({ 
        message: "You can only request rides from drivers at your campus"
      });
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

    // Add notification for the driver
    if (!ride.notifications) {
      ride.notifications = [];
    }
    
    ride.notifications.push({
      userId: ride.driver._id,
      message: `You have a new ride request`,
      read: false,
      createdAt: new Date()
    });

    // Update hitcher reliability
    await User.updateHitcherReliability(user, 'RIDE_REQUESTED');

    await ride.save();
    res.status(200).json({ message: "Ride request sent successfully" });

    message = `You have a new ride request, visit ${process.env.CLIENT_URL} for details`;
    console.log("completed till here");
    sendEmailNotification({message, email : driverEmail});

  } catch (err) {
    logger.error("Error requesting ride", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      message: "Error requesting ride",
      error: err.message || "Unknown error occurred",
    });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const { rideId, hitcherId } = req.body;

    const ride = await Ride.findById(rideId).populate('hitchers.user', 'email').populate('driver', 'name');
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

    // Add notification for the hitcher
    if (!ride.notifications) {
      ride.notifications = [];
    }
    
    ride.notifications.push({
      userId: hitcherId,
      message: `Your ride request has been accepted by the driver`,
      read: false,
      createdAt: new Date()
    });

    await ride.save();

    // Find and cancel all other pending requests from the same hitcher for the same day and direction
    const acceptedRideDate = new Date(ride.date);
    
    // Find all rides for the same day and direction
    const otherRides = await Ride.find({
      _id: { $ne: rideId }, // Exclude the current ride
      status: "scheduled",
      direction: ride.direction,
      date: {
        $gte: new Date(acceptedRideDate.setHours(0, 0, 0, 0)),
        $lt: new Date(acceptedRideDate.setHours(23, 59, 59, 999))
      },
      "hitchers.user": hitcherId,
      "hitchers.status": "pending"
    });

    // Cancel all pending requests from this hitchhiker in other rides
    for (const otherRide of otherRides) {
      const pendingHitcher = otherRide.hitchers.find(
        h => h.user && h.user.toString() === hitcherId && h.status === "pending"
      );
      
      if (pendingHitcher) {
        pendingHitcher.status = "cancelled";
        pendingHitcher.autoCancel = true;
        
        // Add notification for the hitcher about auto-cancellation
        if (!otherRide.notifications) {
          otherRide.notifications = [];
        }
        
        otherRide.notifications.push({
          userId: hitcherId,
          message: `Your ride request was automatically cancelled because another ride request was accepted for the same day and direction`,
          read: false,
          createdAt: new Date()
        });
        
        // Add notification for the driver
        otherRide.notifications.push({
          userId: otherRide.driver,
          message: `A ride request was automatically cancelled because the hitcher was accepted for another ride`,
          read: false,
          createdAt: new Date()
        });
        
        await otherRide.save();
      }
    }

    res.status(200).json({ message: "Ride request accepted successfully" });

    const hitcherEmail = hitcher.user.email;
        
        message = `${ride.driver.name.split(' ')[0]} has accepted your ride request, visit ${process.env.CLIENT_URL} for details`;
        sendEmailNotification({message, email : hitcherEmail});
  } catch (err) {
    logger.error("Error accepting ride", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
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

    // Check if the hitcher has already cancelled their request
    if (hitcher.status === "cancelled") {
      return res.status(400).json({ 
        message: "Cannot reject this request as the hitcher has already cancelled it",
        alreadyCancelled: true
      });
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
    logger.error("Error declining ride", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
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
    logger.error('Error marking notification as read', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
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
    logger.error('Error updating ride status', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
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
    logger.error("Error calculating reliability impact", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

// Get the current status of a specific ride
exports.getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }
    
    res.json({
      success: true,
      rideStatus: ride.status
    });
  } catch (error) {
    logger.error('Error getting ride status', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving ride status' 
    });
  }
};

// Get the status of a specific hitcher in a ride
exports.getHitcherStatus = async (req, res) => {
  try {
    const { rideId, hitcherId } = req.params;
    
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }
    
    const hitcher = ride.hitchers.find(h => h.user && h.user.toString() === hitcherId);
    if (!hitcher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hitcher not found in this ride' 
      });
    }
    
    res.json({
      success: true,
      hitcherStatus: hitcher.status
    });
  } catch (error) {
    logger.error('Error getting hitcher status', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving hitcher status' 
    });
  }
};

exports.updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;
    
    logger.info('Attempting to update ride', {
      rideId,
      userId
    });
    
    // Find the ride
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      logger.warn('Ride not found during update', {
        rideId,
        userId
      });
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }
    
    // Check if the user is the driver of the ride
    if (ride.driver.toString() !== userId) {
      logger.warn('User not authorized to update ride', {
        rideId,
        userId,
        driverId: ride.driver
      });
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to update this ride' 
      });
    }
    
    // Check if the ride is scheduled (not in progress, completed, or cancelled)
    if (ride.status !== 'scheduled') {
      logger.warn('Cannot update ride that is not in scheduled status', {
        rideId,
        status: ride.status,
        userId
      });
      return res.status(400).json({ 
        success: false, 
        message: `Cannot update a ride that is ${ride.status}` 
      });
    }
    
    // Check if there are any pending or accepted hitchers
    const hasPendingOrAcceptedHitchers = ride.hitchers && ride.hitchers.some(
      h => h.status === 'pending' || h.status === 'accepted'
    );
    
    if (hasPendingOrAcceptedHitchers) {
      logger.warn('Cannot update ride with pending or accepted hitchers', {
        rideId,
        userId
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update a ride that has pending or accepted hitchers' 
      });
    }
    
    // Update ride with new information
    const updateData = {
      from: req.body.from,
      to: req.body.to,
      date: req.body.date,
      direction: req.body.direction,
      toCollegeTime: req.body.toCollegeTime,
      fromCollegeTime: req.body.fromCollegeTime,
      availableSeats: req.body.availableSeats,
      pricePerKm: req.body.pricePerKm,
      datetime: req.body.datetime
    };
    
    const updatedRide = await Ride.findByIdAndUpdate(
      rideId, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    logger.info('Ride updated successfully', {
      rideId,
      userId
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Ride updated successfully', 
      ride: updatedRide 
    });
    
  } catch (err) {
    logger.error('Error updating ride', {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Error updating ride',
      error: err.message || 'Unknown error occurred'
    });
  }
};

exports.getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    
    logger.info('Fetching single ride', {
      rideId,
      userId: req.user.id
    });
    
    const ride = await Ride.findById(rideId)
      .populate("driver", "name email phone gender srn college driverProfile.vehicle.model driverProfile.vehicle.registrationNumber driverProfile.reliabilityRate")
      .populate("hitchers.user", "name email phone gender srn college hitcherProfile.reliabilityRate");
    
    if (!ride) {
      logger.warn('Ride not found', {
        rideId,
        userId: req.user.id
      });
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found' 
      });
    }
    
    logger.info('Ride fetched successfully', {
      rideId,
      userId: req.user.id
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Ride fetched successfully', 
      ride 
    });
    
  } catch (err) {
    logger.error('Error fetching ride', {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching ride',
      error: err.message || 'Unknown error occurred'
    });
  }
};