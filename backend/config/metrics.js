const promBundle = require('express-prom-bundle');
const client = require('prom-client');

// Create custom metrics
const activeUsers = new client.Gauge({
    name: 'rideshare_active_users',
    help: 'Number of currently active users'
});

const activeRides = new client.Gauge({
    name: 'rideshare_active_rides',
    help: 'Number of currently active rides'
});

const rideCompletionTime = new client.Histogram({
    name: 'rideshare_ride_completion_seconds',
    help: 'Time taken to complete a ride',
    buckets: [300, 600, 900, 1800, 3600] // 5min, 10min, 15min, 30min, 1hr
});

const userRegistrationRate = new client.Counter({
    name: 'rideshare_user_registrations_total',
    help: 'Total number of user registrations'
});

// Configure metrics middleware
const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { app: 'rideshare-backend' },
    promClient: {
        collectDefaultMetrics: {
            timeout: 5000
        }
    }
});

module.exports = {
    metricsMiddleware,
    metrics: {
        activeUsers,
        activeRides,
        rideCompletionTime,
        userRegistrationRate
    }
}; 