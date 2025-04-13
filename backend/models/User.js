const mongoose = require("mongoose");

// Define the Driver Profile Schema
const DriverProfileSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false,
  },
  vehicle: {
    model: {
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
    min: 1,
    max: 10
  },
  reliabilityRate: {
    type: Number,
    default: 100, // Starting at 100% reliability
    min: 0,
    max: 100,
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

// Define the Notification Schema
const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
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
    unique: true,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  college: {
    type: String,
    enum: ["PES University Ring Road Campus", "PES University Electronic City Campus"],
  },
  srn: {
    type: String,
    // unique: true,
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
  isAdmin: {
    type: Boolean,
    default: false
  },
  notifications: [NotificationSchema],
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  toObject: { virtuals: true }
});

// Add compound indexes for common queries
UserSchema.index({ googleId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ college: 1, gender: 1 }); // For filtering users by college and gender
UserSchema.index({ 'activeRoles.driver': 1, college: 1 }); // For finding active drivers in a college
UserSchema.index({ 'activeRoles.hitcher': 1, college: 1 }); // For finding active hitchers in a college
UserSchema.index({ 'notifications.read': 1, 'notifications.createdAt': -1 }); // For fetching unread notifications

// Add text index for search functionality
UserSchema.index({ name: 'text', email: 'text' });

// Add TTL index for notifications older than 30 days
UserSchema.index({ 'notifications.createdAt': 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Optimize frequently used queries with lean()
UserSchema.statics.findByGoogleId = function(googleId) {
    return this.findOne({ googleId }).lean();
};

UserSchema.statics.findActiveDrivers = function(college) {
    return this.find({
        'activeRoles.driver': true,
        college,
        driverProfileComplete: true
    }).lean();
};

UserSchema.statics.findActiveHitchers = function(college) {
    return this.find({
        'activeRoles.hitcher': true,
        college,
        hitcherProfileComplete: true
    }).lean();
};

// Add method to clean up old notifications
UserSchema.methods.cleanupOldNotifications = function() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.notifications = this.notifications.filter(notification => 
        notification.createdAt > thirtyDaysAgo || !notification.read
    );
    return this.save();
};

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

const User = mongoose.model("User", UserSchema);

// Create indexes in background
User.createIndexes().catch(err => console.error('Error creating indexes:', err));

module.exports = User;
