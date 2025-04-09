const mongoose = require("mongoose");

const bugReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["bug", "feature"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    browser: {
      type: String,
      trim: true,
    },
    device: {
      type: String,
      trim: true,
    },
    screenshot: {
      type: String, // URL to uploaded screenshot
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Index for faster queries
bugReportSchema.index({ reporter: 1 });
bugReportSchema.index({ type: 1 });

const BugReport = mongoose.model("BugReport", bugReportSchema);

module.exports = BugReport; 