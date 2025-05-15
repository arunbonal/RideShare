require('dotenv').config();
const { sendEmailNotification } = require('../utils/email_notifications');

// Verify environment variables
console.log('Environment check:');
console.log('- GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('- GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('- GMAIL_REFRESH_TOKEN exists:', !!process.env.GMAIL_REFRESH_TOKEN);
console.log('- GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('- GMAIL_SENDER_EMAIL:', process.env.GMAIL_SENDER_EMAIL || 'NOT SET (required)');

if (!process.env.GMAIL_SENDER_EMAIL) {
  console.error('\nError: GMAIL_SENDER_EMAIL is not set in environment variables.');
  console.error('Please add GMAIL_SENDER_EMAIL=your_email@gmail.com to your .env file');
  process.exit(1);
}

// Get recipient email from command line arguments or use default test email
const recipient = process.argv[2] || 'test@example.com';

async function testEmailSending() {
  console.log(`\nSending test email to: ${recipient}`);
  
  try {
    // Send test email
    await sendEmailNotification({
      message: 'This is a test email from the RideShare app. If you received this, the Gmail API integration is working correctly!',
      email: recipient
    });
    
    console.log('\nTest email sent successfully!');
    console.log('If you don\'t see the email, please check:');
    console.log('1. Your spam folder');
    console.log('2. That the recipient email address is correct');
    console.log('3. Gmail API logs for any errors');
  } catch (error) {
    console.error('\nError sending test email:', error);
  }
}

testEmailSending(); 