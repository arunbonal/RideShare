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