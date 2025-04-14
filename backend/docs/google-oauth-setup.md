# Google OAuth Configuration Guide

## Google Cloud Console Setup

To ensure your application is properly displayed as "RideShare" in the Google OAuth consent screen:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project
3. Go to "APIs & Services" > "OAuth consent screen"
4. Make sure your app name is set to "RideShare"
5. Ensure your app logo is properly uploaded
6. Complete all required fields in the OAuth consent screen setup
7. Under "Authorized domains", add both your frontend and backend domains without paths
8. Save your changes

## Application Configuration

For your application configuration:

### Authorized JavaScript Origins
- Add your frontend production URL: `https://rideshare-frontend.vercel.app`
- Add your development URL: `http://localhost:5173`

### Authorized Redirect URIs
- Production: `https://rideshare-backend-2789.onrender.com/api/auth/google/callback`
- Development: `http://localhost:5000/api/auth/google/callback`

## Troubleshooting

If your app still shows the backend URL instead of "RideShare" in the consent screen:
1. Check that your app is properly verified in Google Cloud Console
2. Ensure you've completed all required fields in the OAuth consent screen
3. Verify your logo meets Google's requirements (square, 128x128px minimum)
4. Try clearing your browser cache and testing with an incognito window
5. Ensure you've properly set the "Application name" in the OAuth consent screen

## Important Notes

- Changes to the OAuth consent screen can take up to 15 minutes to propagate
- Be sure to test your OAuth flow after making any changes
- If your app is in "Testing" mode, only explicitly added test users will see the consent screen 