const mongoose = require("mongoose");

// Define the Driver Profile Schema
const DriverProfileSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false,
  },
  licenseImage: {
    type: String,
    required: true,
  },
  vehicle: {
    model: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      default: 4,
    },
  },
  pricePerKm: {
    type: Number,
    required: true,
    min: 0,
  },
  reliabilityRate: {
    type: Number,
    default: 100, // Starting at 100% reliability
    min: 0,
    max: 100,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  // New fields for tracking reliability metrics
  completedRides: {
    type: Number,
    default: 0,
  },
  totalRidesCreated: {
    type: Number,
    default: 0,
  },
  cancelledAcceptedRides: {
    type: Number,
    default: 0,
  },
  cancelledNonAcceptedRides: {
    type: Number,
    default: 0,
  },
});

// Define the Hitcher Profile Schema
const HitcherProfileSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false,
  },
  reliabilityRate: {
    type: Number,
    default: 100, // Starting at 100% reliability
    min: 0,
    max: 100,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  // New fields for tracking reliability metrics
  completedRides: {
    type: Number,
    default: 0,
  },
  totalRidesRequested: {
    type: Number,
    default: 0,
  },
  cancelledAcceptedRides: {
    type: Number,
    default: 0,
  },
  cancelledPendingRides: {
    type: Number,
    default: 0,
  },
});

// Main User Schema
const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    // unique: true,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  srn: {
    type: String,
    unique: true,
  },
  homeAddress: {
    type: String,
  },
  distanceToCollege: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ["male", "female"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Roles
  driverProfile: DriverProfileSchema,
  hitcherProfile: HitcherProfileSchema,
  // Profile completion flags
  driverProfileComplete: {
    type: Boolean,
    default: false,
  },
  hitcherProfileComplete: {
    type: Boolean,
    default: false,
  },
  // Current active role (can be both)
  activeRoles: {
    driver: {
      type: Boolean,
      default: false,
    },
    hitcher: {
      type: Boolean,
      default: false,
    },
  },
});

// Method to update driver reliability rate
UserSchema.statics.updateDriverReliability = async function(userId, action) {
  const user = await this.findById(userId);
  if (!user || !user.driverProfile) return;

  switch(action) {
    case 'RIDE_CREATED':
      user.driverProfile.totalRidesCreated += 1;
      break;
    
    case 'RIDE_COMPLETED':
      user.driverProfile.completedRides += 1;
      break;
    
    case 'CANCEL_ACCEPTED_RIDE':
      user.driverProfile.cancelledAcceptedRides += 1;
      // Decrease reliability rate - heavier penalty
      const acceptedPenalty = Math.min(10, 100 / (user.driverProfile.totalRidesCreated || 1) * 20);
      user.driverProfile.reliabilityRate = Math.max(0, user.driverProfile.reliabilityRate - acceptedPenalty);
      break;
    
    case 'CANCEL_NON_ACCEPTED_RIDE':
      user.driverProfile.cancelledNonAcceptedRides += 1;
      // No penalty as per requirements
      break;
  }

  // Recalculate overall reliability rate
  if (user.driverProfile.totalRidesCreated > 0) {
    // Gradually increase reliability for consistent good behavior
    if (action === 'RIDE_COMPLETED') {
      const improvement = Math.min(3, (100 - user.driverProfile.reliabilityRate) * 0.15);
      user.driverProfile.reliabilityRate = Math.min(100, user.driverProfile.reliabilityRate + improvement);
    }
  }

  await user.save();
  return user;
};

// Method to update hitcher reliability rate
UserSchema.statics.updateHitcherReliability = async function(userId, action) {
  const user = await this.findById(userId);
  if (!user || !user.hitcherProfile) return;

  switch(action) {
    case 'RIDE_REQUESTED':
      user.hitcherProfile.totalRidesRequested += 1;
      break;
    
    case 'RIDE_COMPLETED':
      user.hitcherProfile.completedRides += 1;
      break;
    
    case 'CANCEL_ACCEPTED_RIDE':
      user.hitcherProfile.cancelledAcceptedRides += 1;
      // Decrease reliability rate - significant penalty
      const acceptedPenalty = Math.min(10, 100 / (user.hitcherProfile.totalRidesRequested || 1) * 20);
      user.hitcherProfile.reliabilityRate = Math.max(0, user.hitcherProfile.reliabilityRate - acceptedPenalty);
      break;
    
    case 'CANCEL_PENDING_RIDE':
      user.hitcherProfile.cancelledPendingRides += 1;
      // No penalty as per requirements
      break;
  }

  // Recalculate overall reliability rate
  if (user.hitcherProfile.totalRidesRequested > 0) {
    // Gradually increase reliability for consistent good behavior
    if (action === 'RIDE_COMPLETED') {
      const improvement = Math.min(3, (100 - user.hitcherProfile.reliabilityRate) * 0.15);
      user.hitcherProfile.reliabilityRate = Math.min(100, user.hitcherProfile.reliabilityRate + improvement);
    }
  }

  await user.save();
  return user;
};

module.exports = mongoose.model("User", UserSchema);
