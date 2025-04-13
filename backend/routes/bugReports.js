const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const bugReportController = require('../controller/bugReportFixed');
const { logger } = require('../config/logger');

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5MB max file size
const MAX_FILE_SIZE_MB = 1.5; // For error messages

// Middleware to validate file size
const validateFileSize = (req, res, next) => {
    if (!req.body) {
        return res.status(400).json({ error: 'No request body provided' });
    }

    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > MAX_FILE_SIZE) {
        logger.warn('File size too large', {
            size: contentLength,
            maxSize: MAX_FILE_SIZE,
            path: req.path
        });
        return res.status(413).json({
            error: 'File size too large',
            maxSize: `${MAX_FILE_SIZE_MB}MB`,
            receivedSize: `${(contentLength / (1024 * 1024)).toFixed(2)}MB`,
            message: `Please reduce the file size or compress the screenshots. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
        });
    }

    next();
};

// Apply validation middleware
router.use(validateFileSize);

// @route   POST /api/bug-reports
// @desc    Create a new bug report or feature request
// @access  Private
router.post('/', isAuthenticated, async (req, res) => {
    try {
        logger.info('Receiving bug report', {
            contentLength: req.headers['content-length'],
            contentType: req.headers['content-type']
        });

        await bugReportController.createBugReport(req, res);
    } catch (error) {
        logger.error('Error processing bug report', {
            error: error.message,
            stack: error.stack
        });
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to process bug report',
                message: error.message
            });
        }
    }
});

// @route   GET /api/bug-reports
// @desc    Get all bug reports (admin only)
// @access  Private/Admin
router.get('/', isAuthenticated, function(req, res) {
  return bugReportController.getAllBugReports(req, res);
});

// @route   GET /api/bug-reports/daily-count
// @desc    Get current user's bug report count for today
// @access  Private
router.get('/daily-count', isAuthenticated, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await BugReport.countDocuments({
            reporter: req.user.id,
            createdAt: { $gte: today }
        });

        res.json({ count });
    } catch (error) {
        logger.error('Error getting daily report count', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to get daily report count',
            message: error.message
        });
    }
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