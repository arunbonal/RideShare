const Issue = require("../models/Issue");
const Ride = require("../models/Ride");
const User = require("../models/User");
const { sendNotification } = require("../utils/notifications");

// Create a new issue
exports.createIssue = async (req, res) => {
  try {
    const {
      rideId,
      reportedUserId,
      type,
      description,
      evidence,
    } = req.body;

    // Find the ride
    const ride = await Ride.findById(rideId).populate("hitchers.user");
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check if ride is cancelled
    if (ride.status === "cancelled") {
      return res.status(400).json({ message: "Cannot report issues for cancelled rides" });
    }

    // Check if the reporter is authorized to report issues for this ride
    const isDriver = ride.driver._id.toString() === req.user.id;
    const isHitcher = ride.hitchers.some(
      (h) => h.user._id.toString() === req.user.id
    );

    if (!isDriver && !isHitcher) {
      return res.status(403).json({ message: "Not authorized to report issues for this ride" });
    }

    // For hitchers, check if their request was rejected
    if (isHitcher) {
      const hitcherRequest = ride.hitchers.find(h => h.user._id.toString() === req.user.id);
      if (hitcherRequest && hitcherRequest.status === "rejected") {
        return res.status(400).json({ message: "Cannot report issues for rejected ride requests" });
      }
    }

    // Check if an issue already exists from this reporter for this reported user
    const existingIssue = await Issue.findOne({
      ride: rideId,
      reporter: req.user.id,
      reportedUser: reportedUserId
    });

    if (existingIssue) {
      return res.status(400).json({ message: "You have already reported an issue for this user in this ride" });
    }

    // Create the issue
    const issue = new Issue({
      ride: rideId,
      reporter: req.user.id,
      reportedUser: reportedUserId,
      type,
      description,
      evidence,
      status: "open",
    });

    await issue.save();

    // Find all admin users
    const adminUsers = await User.find({ isAdmin: true });
    
    // Send notification to all admin users
    for (const admin of adminUsers) {
      await sendNotification({
        type: "issue_reported",
        title: "New Issue Reported",
        message: `A new ${type} issue has been reported for ride ${rideId}`,
        recipients: [admin._id],
      });
    }

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error creating issue:", error);
    res.status(500).json({ message: "Error creating issue" });
  }
};

// Get all issues (admin only)
exports.getAllIssues = async (req, res) => {
  try {
    const { status, type, category } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;

    const issues = await Issue.find(query)
      .populate({
        path: "ride",
        select: "date direction from to"
      })
      .populate({
        path: "reporter",
        select: "name email phone activeRoles"
      })
      .populate({
        path: "reportedUser",
        select: "name email phone activeRoles"
      })
      .populate({
        path: "resolvedBy",
        select: "name email"
      })
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).json({ message: "Error fetching issues" });
  }
};

// Get issues for a specific user
exports.getUserIssues = async (req, res) => {
  try {
    const issues = await Issue.find({
      $or: [
        { reporter: req.user.id },
        { reportedUser: req.user.id },
      ],
    })
      .populate("ride", "date direction from to")
      .populate({
        path: "reporter",
        select: "name email phone activeRoles"
      })
      .populate({
        path: "reportedUser",
        select: "name email phone activeRoles"
      })
      .populate({
        path: "resolvedBy",
        select: "name email"
      })
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("Error fetching user issues:", error);
    res.status(500).json({ message: "Error fetching user issues" });
  }
};

// Get issues for a specific ride
exports.getRideIssues = async (req, res) => {
  try {
    const { rideId } = req.params;
    const issues = await Issue.find({ ride: rideId })
      .populate({
        path: "reporter",
        select: "name email phone activeRoles"
      })
      .populate({
        path: "reportedUser",
        select: "name email phone activeRoles"
      })
      .populate({
        path: "resolvedBy",
        select: "name email"
      })
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("Error fetching ride issues:", error);
    res.status(500).json({ message: "Error fetching ride issues" });
  }
};

// Update issue status (admin only)
exports.updateIssueStatus = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status, resolution } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    issue.status = status;
    issue.resolution = resolution;
    issue.resolvedBy = req.user.id;
    issue.resolvedAt = new Date();
    issue.lastUpdated = new Date();

    await issue.save();

    // Send notification to reporter
    await sendNotification({
      type: "issue_status_update",
      title: "Issue Status Updated",
      message: `Your issue has been ${status}`,
      recipients: [issue.reporter],
    });

    res.json(issue);
  } catch (error) {
    console.error("Error updating issue status:", error);
    res.status(500).json({ message: "Error updating issue status" });
  }
};

// Report no-show
exports.reportNoShow = async (req, res) => {
  try {
    const { rideId, userId } = req.body;

    // Validate ride exists
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check if user is authorized to report this no-show
    const isDriver = ride.driver.toString() === req.user.id;
    const isHitcher = ride.hitchers.some(
      (h) => h.user.toString() === req.user.id
    );

    if (!isDriver && !isHitcher) {
      return res.status(403).json({
        message: "You are not authorized to report no-shows for this ride",
      });
    }

    // Check if a no-show report already exists
    const existingReport = await Issue.findOne({
      ride: rideId,
      reportedUser: userId,
      type: "no-show",
    });

    if (existingReport) {
      return res.status(400).json({
        message: "A no-show report already exists for this user and ride",
      });
    }

    // Create no-show issue
    const issue = new Issue({
      ride: rideId,
      reporter: req.user.id,
      reportedUser: userId,
      type: "no-show",
      description: "User did not show up for the ride",
      impact: "high",
      category: isDriver ? "hitcher" : "driver",
    });

    await issue.save();

    // Update user's reliability rate
    const user = await User.findById(userId);
    if (user) {
      if (isDriver) {
        user.driverProfile.reliabilityRate = Math.max(
          0,
          user.driverProfile.reliabilityRate - 10
        );
      } else {
        user.hitcherProfile.reliabilityRate = Math.max(
          0,
          user.hitcherProfile.reliabilityRate - 10
        );
      }
      await user.save();
    }

    // Send notification to reported user
    await sendNotification({
      type: "no_show_reported",
      title: "No-Show Reported",
      message: "You have been reported for not showing up to a ride",
      recipients: [userId],
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error("Error reporting no-show:", error);
    res.status(500).json({ message: "Error reporting no-show" });
  }
}; 