const User = require("../models/User");

// Send notification to users
exports.sendNotification = async ({ type, title, message, recipients }) => {
  try {
    // If recipients is "admin", find all admin users
    if (recipients === "admin") {
      const adminUsers = await User.find({ role: "admin" });
      recipients = adminUsers.map(admin => admin._id);
    }

    // Ensure recipients is an array
    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    // Update notifications for each recipient
    await User.updateMany(
      { _id: { $in: recipients } },
      {
        $push: {
          notifications: {
            type,
            title,
            message,
            read: false,
            createdAt: new Date(),
          },
        },
      }
    );

    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}; 