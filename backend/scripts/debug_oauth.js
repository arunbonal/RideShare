const { google } = require('googleapis');
require('dotenv').config();

// Log environment variables (without exposing sensitive values)
console.log('Environment check:');
console.log('- GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('- GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('- GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

// Create OAuth client with exact redirect URI for debugging
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
console.log('\nUsing redirect URI:', redirectUri);

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

// Generate auth URL
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

// Parse and display the URL components to identify any issues
console.log('\nGenerated Auth URL:', authUrl);

// Parse URL to check parameters
const url = new URL(authUrl);
console.log('\nAuth URL breakdown:');
console.log('- Protocol:', url.protocol);
console.log('- Host:', url.host);
console.log('- Pathname:', url.pathname);
console.log('- Search params:');
url.searchParams.forEach((value, key) => {
  // Don't show client_id or client_secret fully
  if (key === 'client_id') {
    console.log(`  ${key}: ${value.substring(0, 5)}...${value.substring(value.length - 5)}`);
  } else if (key === 'redirect_uri') {
    console.log(`  ${key}: ${value} (THIS MUST MATCH EXACTLY IN GOOGLE CLOUD CONSOLE)`);
  } else {
    console.log(`  ${key}: ${value}`);
  }
});

console.log('\nInstructions:');
console.log('1. Verify that the redirect_uri above EXACTLY matches what you added in Google Cloud Console');
console.log('2. Make sure there are no typos, trailing slashes, or other differences');
console.log('3. The URL must be identical, character for character'); 