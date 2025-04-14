# Updating OAuth Consent Screen

To fix the issue with your backend URL being exposed in the OAuth consent screen, you need to configure your Google Cloud Console OAuth Consent Screen with the newly created Terms and Conditions and Privacy Policy pages.

## Steps to Update Google Cloud Console

1. Log in to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Edit your OAuth consent screen

## Required Updates

Update the following fields with the full URLs to your new legal pages:

- **Privacy Policy URL**: `https://rideshare-frontend.vercel.app/privacy-policy`
- **Terms of Service URL**: `https://rideshare-frontend.vercel.app/terms`

## Other Important Fields

Ensure these fields are also properly configured:

- **Application name**: RideShare
- **User support email**: rideshare.pesu@gmail.com
- **Application logo**: Upload a proper square logo (at least 128x128px)
- **Authorized domains**: 
  - rideshare-frontend.vercel.app
  - rideshare-backend-2789.onrender.com

## Application Type

- If your app is currently in "Testing" mode, consider publishing it
- Testing mode limits to only specified test users
- Publishing requires verification if you have sensitive scopes

## After Making Updates

- Save the changes and wait approximately 15 minutes for them to propagate
- Test the OAuth flow in an incognito browser window to see if "RideShare" now appears instead of your backend URL
- If issues persist, try clearing your browser cache

## Troubleshooting

If you still see the backend URL in the consent screen:
1. Verify that all required fields are filled in
2. Check that your logo meets Google's requirements
3. Ensure both domains are properly authorized
4. Consider initiating the verification process if your app is in "External" mode 