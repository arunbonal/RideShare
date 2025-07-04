const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  hitchers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "cancelled", "completed", "cancelled-by-driver"],
        default: "pending",
      },
      pickupLocation: {
        type: String,
      },
      dropoffLocation: {
        type: String,
      },
      fare: {
        type: Number,
      },
      requestTime: {
        type: Date,
        default: Date.now,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"]
      },
      autoCancel: {
        type: Boolean,
        default: false
      }
    },
  ],
  notifications: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
    },
  ],
  pricePerKm: {
    type: Number,
    required: true,
    min: 0,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    validate: {
      validator: function (date) {
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return date <= new Date(Date.now() + oneWeek);
      },
      message: "Ride date cannot be more than one week from now",
    },
  },
  toCollegeTime: {
    type: String,
  },
  fromCollegeTime: {
    type: String,
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["scheduled", "in-progress", "completed", "cancelled"],
    default: "scheduled",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  direction: {
    type: String,
    enum: ["toCollege", "fromCollege"],
    required: true,
  },
  totalFare: {
    type: Number,
    default: 0,
  },
  statusHistory: {
    type: [{
      status: String,
      changedAt: Date
    }],
    default: []
  }
});

// Update the updatedAt field on save
RideSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Ride", RideSchema);
