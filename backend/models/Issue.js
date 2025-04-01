const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["no-show", "safety", "payment", "other"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    resolution: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
    evidence: [{
      type: String, // URLs to uploaded evidence (images, documents, etc.)
    }],
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
issueSchema.index({ ride: 1, status: 1 });
issueSchema.index({ reporter: 1, status: 1 });
issueSchema.index({ reportedUser: 1, status: 1 });

const Issue = mongoose.model("Issue", issueSchema);

module.exports = Issue; 