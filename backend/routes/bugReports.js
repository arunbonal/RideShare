const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const bugReportController = require('../controller/bugReportFixed');

// @route   POST /api/bug-reports
// @desc    Create a new bug report or feature request
// @access  Private
router.post('/', isAuthenticated, function(req, res) {
  return bugReportController.createBugReport(req, res);
});

// @route   GET /api/bug-reports
// @desc    Get all bug reports (admin only)
// @access  Private/Admin
router.get('/', isAuthenticated, function(req, res) {
  return bugReportController.getAllBugReports(req, res);
});

// @route   GET /api/bug-reports/user
// @desc    Get bug reports by current user
// @access  Private
router.get('/user', isAuthenticated, function(req, res) {
  return bugReportController.getUserBugReports(req, res);
});

// @route   GET /api/bug-reports/:id
// @desc    Get a single bug report by ID
// @access  Private
router.get('/:id', isAuthenticated, function(req, res) {
  return bugReportController.getBugReportById(req, res);
});

// @route   DELETE /api/bug-reports/:id
// @desc    Delete a bug report
// @access  Private/Admin
router.delete('/:id', isAuthenticated, function(req, res) {
  return bugReportController.deleteBugReport(req, res);
});

module.exports = router; 