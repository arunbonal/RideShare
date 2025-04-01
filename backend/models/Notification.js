const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
      enum: ["admin", "user"],
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      enum: [
        "issue_reported",
        "issue_status_update",
        "no_show_reported",
        "ride_status_update",
        "payment_received",
        "payment_failed",
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema); 