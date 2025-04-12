const BugReport = require('./models/BugReport');    
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
        deleteBugReports();
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });     

const deleteBugReports = async () => {
    try {
        await BugReport.deleteMany({});
        console.log('All bug reports deleted successfully');
    } catch (error) {
        console.error('Error deleting bug reports:', error);
    } finally {
        mongoose.connection.close();
    }
};


