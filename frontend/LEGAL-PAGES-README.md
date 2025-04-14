# Legal Pages for RideShare Application

## Overview

This update adds Terms and Conditions and Privacy Policy pages to the RideShare application. These pages are required for the Google OAuth consent screen to display "RideShare" instead of exposing the backend URL.

## Files Created

1. **Terms and Conditions**
   - File: `src/pages/TermsAndConditions.tsx`
   - URL: `/terms`
   - Compliant with Indian laws
   - Covers all necessary aspects of the RideShare service

2. **Privacy Policy**
   - File: `src/pages/PrivacyPolicy.tsx`
   - URL: `/privacy`
   - Compliant with Indian Information Technology Act, 2000 and IT Rules, 2011
   - Includes provisions for a Grievance Officer as required by Indian law

3. **OAuth Setup Guide**
   - File: `src/docs/OAUTH-SETUP.md`
   - Contains detailed instructions for updating your Google Cloud Console

## Updates Made

- Added new page components for Terms and Privacy Policy
- Updated routes in `App.tsx` to include the new pages
- Added links to these pages in the Login page footer
- Added documentation for OAuth consent screen setup

## Google OAuth Setup Steps

After deploying these changes to production, follow these steps:

1. Log in to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Update the following fields:
   - Privacy Policy URL: `https://rideshare-frontend.vercel.app/privacy`
   - Terms of Service URL: `https://rideshare-frontend.vercel.app/terms`
   - App name: RideShare
   - User support email: rideshare.pesu@gmail.com
   - Upload an appropriate logo (at least 128x128px)
   - Add authorized domains (both frontend and backend)

## Testing

After deploying and updating the OAuth consent screen:

1. Clear your browser cache or use an incognito window
2. Try logging in with Google OAuth
3. Verify that "RideShare" appears as the app name in the consent screen
4. Confirm that links to Terms and Privacy Policy are working

## Additional Notes

- Changes to the Google OAuth consent screen can take up to 15 minutes to propagate
- For full compliance with Indian laws, ensure you maintain a Grievance Officer as specified in the Privacy Policy
- Consider publishing your app (rather than keeping it in "Testing" mode) if you want it available to all users

See `src/docs/OAUTH-SETUP.md` for detailed configuration instructions. 