const User = require('./models/User');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MONGODB_URI is not defined in the environment variables');
}

mongoose.connect(uri, {})
    .then(() => {
        console.log('MongoDB connected successfully');
        initReliability();
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

const initReliability = async () => {
    try {
        const users = await User.find();
        for (const user of users) {
            if (user.driverProfile) {
                user.driverProfile.totalRidesCreated = 0;
                user.driverProfile.completedRides = 0;
                user.driverProfile.cancelledAcceptedRides = 0;
                user.driverProfile.cancelledNonAcceptedRides = 0;
                user.driverProfile.reliabilityRate = 100;
            }
            if (user.hitcherProfile) {
                user.hitcherProfile.totalRidesRequested = 0;
                user.hitcherProfile.completedRides = 0;
                user.hitcherProfile.cancelledAcceptedRides = 0;
                user.hitcherProfile.cancelledPendingRides = 0;
                user.hitcherProfile.reliabilityRate = 100;
            }
            await user.save();
        }
        console.log('Reliability rates initialized successfully');
    } catch (error) {
        console.error('Error initializing reliability rates:', error);
    } finally {
        mongoose.connection.close();
    }
};
