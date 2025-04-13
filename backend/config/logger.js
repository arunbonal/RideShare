const winston = require('winston');
const path = require('path');
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

                // Always add breadcrumb for log context
                Sentry.addBreadcrumb({
                    level: levelMap[level] || 'info',
                    message: message,
                    data: meta,
                    timestamp: Date.now(),
                    category: meta.category || 'general'
                });

                // For errors, capture as exceptions
                if (level === 'error') {
                    if (message instanceof Error) {
                        Sentry.captureException(message);
                    } else {
                        Sentry.captureException(new Error(message));
                    }
                } 
                // For warnings, capture as issues
                else if (level === 'warn') {
                    Sentry.captureMessage(message, {
                        level: 'warning',
                        extra: meta,
                        tags: { type: 'warning' }
                    });
                }
                // For info and debug, capture as messages
                else {
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
        // Console transport with colors
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Sentry transport (will be silent if SENTRY_DSN is not set)
        new SentryTransport()
    ]
});

// Add file transports in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
    
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}

// Create a stream object for Morgan
const stream = {
    write: (message) => {
        logger.info(message.trim());
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