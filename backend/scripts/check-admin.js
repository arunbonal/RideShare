require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = process.argv[2] || "arunbonal516@gmail.com";
    
    console.log(`Checking admin status for email: ${email}`);
    
    const admin = await Admin.findOne({ email });
    
    if (admin) {
      console.log('Admin found in database:', admin);
    } else {
      console.log('Admin not found in database');
      
      // Try to add the admin
      console.log('Adding admin to database...');
      const newAdmin = new Admin({ email });
      await newAdmin.save();
      console.log('Admin added successfully');
    }
    
    // List all admins
    const allAdmins = await Admin.find({});
    console.log('\nAll admins in database:');
    allAdmins.forEach(a => console.log(`- ${a.email}`));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmin(); 