# Email Notifications with Gmail API

## Overview
This project now uses Gmail API for sending email notifications. This document explains how to set up and use the Gmail API integration.

## Prerequisites
- Google account with Gmail
- Google Cloud Console project with Gmail API enabled
- Google OAuth2 client ID and secret (already set up for Google authentication)

## Setup Instructions

### 1. Enable Gmail API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Library"
4. Search for "Gmail API" and enable it

### 2. Configure OAuth Consent Screen and OAuth Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "OAuth consent screen"
4. Complete the consent screen setup if not already done
5. Navigate to "APIs & Services" > "Credentials"
6. Find your OAuth 2.0 Client ID used for Google authentication
7. Click on it to edit
8. Add your authorized redirect URIs:
   - Add `https://developers.google.com/oauthplayground` as an authorized redirect URI
   - You can also add your application's domain for production use
9. Save the changes

### 3. Get Gmail API Refresh Token
Run the script to obtain a refresh token:

```bash
node scripts/get_gmail_token.js
```

Follow the prompts in the terminal:
- You'll be asked to enter your authorized redirect URI (use the same one you added in step 2.8)
- The script will generate a URL to authorize the application
- Visit the URL, log in with your Google account, and authorize the app
- Copy the authorization code from the redirect URL
- Paste the code back into the terminal
- The script will generate a refresh token

### 4. Update Environment Variables
Add these variables to your `.env` file:

```
# Gmail API (required for email notifications)
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_SENDER_EMAIL=your_gmail_address@gmail.com
GOOGLE_REDIRECT_URI=your_authorized_redirect_uri
```

## How It Works
1. The `email_notifications.js` utility uses Gmail API to send emails
2. It creates an OAuth2 client using your Google credentials
3. It formats the email content with HTML
4. It encodes the email as required by Gmail API
5. It sends the email using the Gmail API client

## Troubleshooting

### Redirect URI Mismatch Error
If you see an error like "Error 400: redirect_uri_mismatch", it means that:
1. The redirect URI used in your code doesn't match any of the authorized redirect URIs in your Google Cloud Console
2. To fix this:
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Edit your OAuth client ID
   - Add the redirect URI that matches what you're using in your code
   - Save changes and try again

### Other Issues
- **Authentication Errors**: Make sure your refresh token is valid and added to the `.env` file
- **Permission Errors**: Ensure Gmail API is enabled and the OAuth2 client has access to it
- **Sender Email Issues**: The `GMAIL_SENDER_EMAIL` must match the email used to obtain the refresh token

## Security Considerations
- Keep your refresh token secure; it provides access to your Gmail account
- Consider using a service account for production environments
- Refresh tokens may expire based on your Google Cloud project settings 