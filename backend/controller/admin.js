const User = require('../models/User');
const Ride = require('../models/Ride');

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-__v');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-__v');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

exports.updateUser = async (req, res) => {
    try {
        const { phone, gender, homeAddress } = req.body;
        
        // Validate gender
        if (gender !== 'male' && gender !== 'female') {
            return res.status(400).json({ error: 'Gender must be either male or female' });
        }
        
        // Find user and update only editable fields
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 
                phone, 
                gender,
                homeAddress
            },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

exports.deleteUser = async (req, res) => {
    try {
        // Check if user exists and is not an admin
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Admin users cannot be deleted' });
        }
        
        // Delete the user
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

exports.getRides = async (req, res) => {
    try {
        const rides = await Ride.find()
          .populate('driver', 'name email phone college driverProfile.reliabilityRate')
          .populate('hitchers.user', 'name email phone college hitcherProfile.reliabilityRate');
        res.json(rides);
    } catch (error) {
        console.error('Error fetching rides:', error);
        res.status(500).json({ error: 'Server error' });
    }
}