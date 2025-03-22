const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controller/admin');

// Apply auth middleware to all routes
router.use(isAuthenticated);
router.use(adminAuth);

// Get all users (admin only)
router.get('/users', adminController.getUsers);
  
// Get all rides (admin only)
router.get('/rides', adminController.getRides);

// Add an admin
router.post('/add-admin', adminController.addAdmin);

// Remove an admin
router.post('/remove-admin', adminController.removeAdmin);

module.exports = router; 