const winston = require('winston');
const { Sentry } = require('./sentry');

// Custom Sentry transport for Winston that handles errors gracefully
class SentryTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.name = 'SentryTransport';
        this.silent = !process.env.SENTRY_DSN;
    }

    log(info, callback) {
        if (this.silent) {
            callback();
            return;
        }

        setImmediate(() => {
            try {
                const { level, message, ...meta } = info;
                
                // Map Winston levels to Sentry levels
                const levelMap = {
                    error: 'error',
                    warn: 'warning',
                    info: 'info',
                    debug: 'debug',
                    verbose: 'debug'
                };

                // Only send important logs to Sentry in production
                if (process.env.NODE_ENV === 'production') {
                    // Always send errors
                    if (level === 'error') {
                        if (message instanceof Error) {
                            Sentry.captureException(message);
                        } else {
                            Sentry.captureException(new Error(message));
                        }
                    }
                    // Send warnings
                    else if (level === 'warn') {
                        Sentry.captureMessage(message, {
                            level: 'warning',
                            extra: meta,
                            tags: { type: 'warning' }
                        });
                    }
                    // Sample info logs (10%)
                    else if (level === 'info' && Math.random() < 0.1) {
                        Sentry.captureMessage(message, {
                            level: 'info',
                            extra: meta,
                            tags: { type: 'info' }
                        });
                    }
                    // Don't send debug logs to Sentry in production
                } else {
                    // In development, send all logs to Sentry
                    Sentry.captureMessage(message, {
                        level: levelMap[level] || 'info',
                        extra: meta,
                        tags: { type: level }
                    });
                }
            } catch (error) {
                console.error('Sentry transport error:', error);
            }
            callback();
        });
    }
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { 
        service: 'rideshare-backend',
        environment: process.env.NODE_ENV 
    },
    transports: [
        // Console transport in development only
        ...(process.env.NODE_ENV !== 'production' ? [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ] : []),
        // Sentry transport
        new SentryTransport()
    ]
});

// Create a stream object for Morgan (only log HTTP in development)
const stream = {
    write: (message) => {
        if (process.env.NODE_ENV !== 'production') {
            logger.info(message.trim());
        }
    },
};

// Helper functions for consistent logging
const logHelpers = {
    error: (message, meta = {}) => logger.error(message, { ...meta, type: 'error' }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, type: 'warning' }),
    info: (message, meta = {}) => logger.info(message, { ...meta, type: 'info' }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, type: 'debug' }),
    http: (message, meta = {}) => logger.http(message, { ...meta, type: 'http' })
};

module.exports = {
    logger,
    stream,
    ...logHelpers
}; 