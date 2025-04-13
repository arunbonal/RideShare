# RideShare Frontend

A modern, responsive web application for the RideShare platform built with React, TypeScript, and Tailwind CSS.

## Features

- Google OAuth authentication
- Phone number verification
- Interactive ride management
- Real-time ride tracking
- Bug and feature reporting system
- Responsive design for all devices
- Dark mode support
- Admin dashboard

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Maps API key
- Backend server running

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Update the `.env.local` file with your credentials

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key
- `NEXT_PUBLIC_BACKEND_URL`: Backend server URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID

## Development

Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
# or
yarn build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   ├── styles/        # Global styles
│   └── types/         # TypeScript type definitions
├── public/            # Static assets
└── tests/            # Test files
```

## Key Components

- `DriverProfileSetup`: Driver onboarding flow
- `RideManagement`: Ride creation and management
- `MapPreview`: Interactive map interface
- `Report`: Bug and feature reporting system
- `AdminDashboard`: Admin control panel

## Testing

```bash
npm run test
# or
yarn test
```

## Deployment

The application is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## Design System

- Built with Tailwind CSS
- Consistent spacing and color schemes
- Mobile-first approach
- Dark mode support
- Accessible components

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License 