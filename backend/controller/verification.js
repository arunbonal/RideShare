const { twilioClient, verifyServiceSid } = require('../config/twilio');

const sendVerificationCode = async (req, res) => {
  const { phoneNumber } = req.body;
  
  // Validate phone number format
  if (!phoneNumber || !phoneNumber.startsWith('+91')) {
    console.error('Invalid phone number format:', phoneNumber);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid phone number format. Must start with +91' 
    });
  }

  try {
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({ to: phoneNumber, channel: 'sms' });

    res.json({ 
      success: true, 
      message: 'Verification code sent successfully',
      status: verification.status 
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    // Send more specific error message to client
    const errorMessage = error.message || 'Error sending verification code';
    res.status(400).json({ 
      success: false, 
      message: errorMessage 
    });
  }
};

const verifyCode = async (req, res) => {
  const { phoneNumber, code } = req.body;

  // Validate inputs
  if (!phoneNumber || !code) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number and verification code are required' 
    });
  }

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: phoneNumber, code });

    if (verificationCheck.status === 'approved') {
      // Update user's record to mark phone as verified if we have a user
      if (req.user && req.user._id) {
        const User = require('../models/User');
        await User.findByIdAndUpdate(
          req.user._id, 
          { isPhoneVerified: true }
        );
      }
      
      res.json({ 
        success: true, 
        message: 'Phone number verified successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    // Send more specific error message to client
    const errorMessage = error.message || 'Error verifying code';
    res.status(400).json({ 
      success: false, 
      message: errorMessage 
    });
  }
};

module.exports = { sendVerificationCode, verifyCode };