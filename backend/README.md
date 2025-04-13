# RideShare Backend

This is the backend server for the RideShare application, built with Node.js, Express, MongoDB, and Redis.

## Features

- User authentication with Google OAuth
- Phone number verification with Twilio
- Real-time ride management
- Bug and feature reporting system
- Admin dashboard for user management
- Rate limiting and security measures
- Comprehensive logging and monitoring

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Redis instance
- Google OAuth credentials
- Twilio account

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your credentials

## Environment Variables

See `.env.example` for all required environment variables and their descriptions.

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Documentation

### Authentication
- `POST /auth/google`: Google OAuth authentication
- `POST /auth/verify`: Phone number verification

### Rides
- `POST /ride/create`: Create a new ride
- `GET /ride/upcoming`: Get upcoming rides
- `GET /ride/past`: Get past rides
- `PUT /ride/cancel`: Cancel a ride

### Reports
- `POST /bug-reports`: Submit a bug report
- `POST /feature-reports`: Submit a feature request

### Admin
- `GET /admin/users`: Get all users
- `PUT /admin/user/status`: Update user status

## Monitoring

### Logs
- Development: View logs in console or `/logs` directory
- Production: Access logs via Render dashboard

### Metrics
- Development: Access metrics at `/metrics` endpoint
- Production: View system metrics in Render dashboard

## Security

- Rate limiting implemented
- CORS configured
- Session management
- Input validation
- Error handling

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT License 