const { google } = require('googleapis');
require('dotenv').config();

// Create OAuth2 client using existing Google OAuth credentials
const createOAuth2Client = () => {
  // Check if we have a redirect URI in env vars
  if (!process.env.GOOGLE_REDIRECT_URI) {
    console.warn('Warning: GOOGLE_REDIRECT_URI is not set in environment variables.');
    console.warn('If you encounter authentication issues, please run the get_gmail_token.js script again.');
  }

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );

  // Set credentials using refresh token from environment variables
  // In production, you should store this securely
  oAuth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  return oAuth2Client;
};

// Initialize Gmail API
const getGmailClient = () => {
  const auth = createOAuth2Client();
  return google.gmail({ version: 'v1', auth });
};

module.exports = {
  getGmailClient,
  createOAuth2Client
}; 