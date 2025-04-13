const winston = require('winston');
const { Sentry } = require('./sentry');

// Custom Sentry transport for Winston that handles errors gracefully
class SentryTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.name = 'SentryTransport';
        this.silent = !process.env.SENTRY_DSN;
        console.log('SentryTransport initialized:', {
            silent: this.silent,
            dsn: !!process.env.SENTRY_DSN
        });
    }

    log(info, callback) {
        if (this.silent) {
            console.log('Sentry transport is silent, skipping log:', info);
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

                // Send all important logs to Sentry
                if (process.env.NODE_ENV === 'production') {
                    // Always send errors and warnings
                    if (level === 'error' || level === 'warn') {
                        if (message instanceof Error) {
                            console.log('Sending error to Sentry:', message);
                            Sentry.captureException(message);
                        } else {
                            console.log('Sending message to Sentry:', { level, message });
                            Sentry.captureMessage(message, {
                                level: levelMap[level],
                                extra: meta,
                                tags: { type: level }
                            });
                        }
                    }
                    // Send all info logs
                    else if (level === 'info') {
                        console.log('Sending info to Sentry:', message);
                        Sentry.captureMessage(message, {
                            level: 'info',
                            extra: meta,
                            tags: { type: 'info' }
                        });
                    }
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