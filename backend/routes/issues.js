const express = require("express");
const router = express.Router();
const issueController = require("../controller/issue");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

// Create a new issue
router.post("/", isAuthenticated, issueController.createIssue);

// Get all issues (admin only)
router.get("/", isAuthenticated, isAdmin, issueController.getAllIssues);

// Get issues for the current user
router.get("/user", isAuthenticated, issueController.getUserIssues);

// Get issues for a specific ride
router.get("/ride/:rideId", isAuthenticated, issueController.getRideIssues);

// Update issue status (admin only)
router.patch("/:issueId/status", isAuthenticated, isAdmin, issueController.updateIssueStatus);

// Report no-show
router.post("/no-show", isAuthenticated, issueController.reportNoShow);

module.exports = router; 