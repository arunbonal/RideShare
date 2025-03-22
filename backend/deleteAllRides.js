const Ride = require('./models/Ride');
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
        deleteAllRides();
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

const deleteAllRides = async () => {
    try {
        await Ride.deleteMany({});
        console.log('All rides deleted successfully');
    } catch (error) {
        console.error('Error deleting rides:', error);
    } finally {
        mongoose.connection.close();
    }
};


