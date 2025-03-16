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
  completedTripsAsDriver: {
    type: Number,
    default: 0,
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
});

// Define the Hitcher Profile Schema
const HitcherProfileSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false,
  },
  completedTripsAsHitcher: {
    type: Number,
    default: 0,
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
  reliabilityRate: {
    type: Number,
    default: 0,
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

module.exports = mongoose.model("User", UserSchema);
