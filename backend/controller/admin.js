const User = require('../models/User');
const Ride = require('../models/Ride');
const Admin = require('../models/Admin');

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-__v');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

exports.getRides = async (req, res) => {
    try {
        const rides = await Ride.find()
          .populate('driver', 'name email phone driverProfile.reliabilityRate')
          .populate('hitchers.user', 'name email phone hitcherProfile.reliabilityRate');
        res.json(rides);
    } catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

exports.addAdmin = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
    
        // Check if admin already exists
        let admin = await Admin.findOne({ email });
        if (admin) {
          return res.status(400).json({ error: 'This email is already registered as an admin' });
        }
    
        // Create new admin
        admin = new Admin({ email });
        await admin.save();
    
        // If the user already exists, update their isAdmin status
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          existingUser.isAdmin = true;
          await existingUser.save();
        }
    
        res.json({ success: true, message: 'Admin added successfully' });
      } catch (error) {
        console.error('Error adding admin:', error);
        res.status(500).json({ error: 'Server error' });
      }
}

exports.removeAdmin = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
    
        // Don't allow removing yourself
        if (email === req.user.email) {
          return res.status(400).json({ error: 'You cannot remove yourself as an admin' });
        }
    
        const result = await Admin.deleteOne({ email });
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Admin not found' });
        }
    
        // Update user's isAdmin status
        await User.updateOne({ email }, { $set: { isAdmin: false } });
    
        res.json({ success: true, message: 'Admin removed successfully' });
      } catch (error) {
        console.error('Error removing admin:', error);
        res.status(500).json({ error: 'Server error' });
      }
}
