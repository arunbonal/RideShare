const BugReport = require('../models/BugReport');
const User = require('../models/User');

const bugReportController = {
  // Create a new bug report or feature request
  createBugReport: async (req, res) => {
    try {
      const { type, title, description, browser, device, screenshot } = req.body;
      const reporter = req.user.id;

      // Validate required fields
      if (!type || !title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Type, title, and description are required fields'
        });
      }

      // Create new bug report
      const bugReport = new BugReport({
        reporter,
        type,
        title,
        description,
        browser,
        device,
        screenshot
      });

      await bugReport.save();

      res.status(201).json({
        success: true,
        message: type === 'bug' ? 'Bug report submitted successfully' : 'Feature request submitted successfully',
        bugReport
      });
    } catch (error) {
      console.error('Error creating bug report:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while submitting report'
      });
    }
  },

  // Get all bug reports (admin only)
  getAllBugReports: async (req, res) => {
    try {
      // Verify if user is admin
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only resource'
        });
      }

      const bugReports = await BugReport.find()
        .populate('reporter', 'name email phone')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: bugReports.length,
        data: bugReports
      });
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching bug reports'
      });
    }
  },

  // Get daily bug report count for current user
  getDailyBugReportCount: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get start of today (midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Count reports submitted today by this user
      const count = await BugReport.countDocuments({
        reporter: userId,
        createdAt: { $gte: today }
      });
      
      res.json({
        success: true,
        count: count
      });
    } catch (error) {
      console.error('Error getting daily bug report count:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while checking report count'
      });
    }
  },

  // Get bug reports by user
  getUserBugReports: async (req, res) => {
    try {
      const userId = req.user.id;

      const bugReports = await BugReport.find({ reporter: userId })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: bugReports.length,
        data: bugReports
      });
    } catch (error) {
      console.error('Error fetching user bug reports:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching your reports'
      });
    }
  },

  // Get a single bug report by ID
  getBugReportById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const bugReport = await BugReport.findById(id)
        .populate('reporter', 'name email phone');
      
      if (!bugReport) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      // If not admin and not the reporter, deny access
      if (!req.user.isAdmin && bugReport.reporter._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own reports'
        });
      }
      
      res.json({
        success: true,
        data: bugReport
      });
    } catch (error) {
      console.error('Error fetching bug report details:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching report details'
      });
    }
  },

  // Delete a bug report (admin only)
  deleteBugReport: async (req, res) => {
    try {
      // Verify if user is admin
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only action'
        });
      }
      
      const { id } = req.params;
      
      // Check if bug report exists
      const bugReport = await BugReport.findById(id);
      if (!bugReport) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      await BugReport.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'Bug report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting bug report:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting report'
      });
    }
  }
};

module.exports = bugReportController; 