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
        enum: ["pending", "accepted", "rejected", "cancelled"],
        default: "pending",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
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
    },
  ],
  pricePerKm: {
    type: Number,
    required: true,
    min: 0,
  },
  note: {
    type: String,
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
    min: 1,
  },
  status: {
    type: String,
    enum: ["scheduled", "in-progress", "completed", "cancelled"],
    default: "scheduled",
  },
  route: {
    type: String, // Could be a polyline or GeoJSON in a production app
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
});

// Update the updatedAt field on save
RideSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Ride", RideSchema);
