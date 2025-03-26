const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controller/admin');
const { getRideDetails } = require('../controller/admin');

// Apply auth middleware to all routes
router.use(isAuthenticated);
router.use(adminAuth);

// Get all users (admin only)
router.get('/users', adminController.getUsers);

// Get user by ID (admin only)
router.get('/users/:id', adminController.getUserById);

// Update user (admin only)
router.put('/users/:id', adminController.updateUser);

// Delete user (admin only)
router.delete('/users/:id', adminController.deleteUser);
  
// Get all rides (admin only)
router.get('/rides', adminController.getAllRides);

router.get('/rides/:id', adminController.getRideDetails);

module.exports = router;