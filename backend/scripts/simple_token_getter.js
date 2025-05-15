const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('========================');
console.log('GMAIL TOKEN GENERATOR');
console.log('========================');

// IMPORTANT: This must match EXACTLY what you added in Google Cloud Console
// No trailing slashes, must be identical character for character
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

console.log(`Using redirect URI: ${REDIRECT_URI}`);
console.log('Make sure this EXACTLY matches what you added in Google Cloud Console');

// Create an OAuth2 client using the credentials
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Define the scopes we need
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Generate auth URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Force to get refresh token
});

console.log('\n1. Visit this URL to authorize the application:');
console.log(authUrl);
console.log('\n2. After authorization, you will be redirected to the OAuth Playground.');
console.log('3. You will see a code in the browser or in the URL. Copy that code.');

rl.question('\nEnter the authorization code: ', (code) => {
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error getting access token:', err);
      rl.close();
      return;
    }
    
    console.log('\n========================');
    console.log('SUCCESS! Add this to your .env file:');
    console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
    console.log(`GOOGLE_REDIRECT_URI=${REDIRECT_URI}`);
    console.log('========================');
    
    rl.close();
  });
}); 