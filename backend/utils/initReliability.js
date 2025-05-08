const User = require("../models/User");

exports.initReliability = async () => {
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
    }
};