const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get redirect URI from environment or use default
console.log('------------------------');
console.log('Gmail API Authorization Setup');
console.log('------------------------');

rl.question('Enter your authorized redirect URI from Google Cloud Console (press Enter to use the default OAuth playground): ', (redirectUri) => {
  // Use provided redirect URI or default to OAuth playground
  const actualRedirectUri = redirectUri || 'https://developers.google.com/oauthplayground';
  
  console.log(`Using redirect URI: ${actualRedirectUri}`);
  
  // Create an OAuth2 client using the credentials
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    actualRedirectUri
  );

  // Define the scopes we need
  const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

  /**
   * Get and store new token after prompting for user authorization
   */
  function getNewToken() {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force to get refresh token
    });
    
    console.log('------------------------');
    console.log('Follow these steps to get your Gmail API refresh token:');
    console.log('------------------------');
    console.log('1. Add these environment variables to your .env file if not already present:');
    console.log('   GOOGLE_CLIENT_ID=your_client_id');
    console.log('   GOOGLE_CLIENT_SECRET=your_client_secret');
    console.log('   GMAIL_SENDER_EMAIL=your_gmail_address@gmail.com');
    console.log('------------------------');
    console.log('2. Visit this URL to authorize the application:');
    console.log(authUrl);
    console.log('------------------------');
    console.log('3. After authorization, you will be redirected. Copy the authorization code from the URL:');
    
    rl.question('Enter the authorization code here: ', (code) => {
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error getting access token:', err);
          rl.close();
          return;
        }
        
        console.log('------------------------');
        console.log('Add this to your .env file:');
        console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
        console.log(`GOOGLE_REDIRECT_URI=${actualRedirectUri}`);
        console.log('------------------------');
        console.log('Your Gmail API integration is now ready to use!');
        
        rl.close();
      });
    });
  }

  getNewToken();
}); 