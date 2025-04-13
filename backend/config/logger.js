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
                
                const levelMap = {
                    error: 'error',
                    warn: 'warning',
                    info: 'info',
                    debug: 'debug'
                };

                Sentry.addBreadcrumb({
                    level: levelMap[level] || 'info',
                    message: message,
                    data: meta,
                    timestamp: Date.now()
                });

                if (level === 'error') {
                    if (message instanceof Error) {
                        Sentry.captureException(message);
                    } else {
                        Sentry.captureException(new Error(message));
                    }
                } else {
                    Sentry.captureMessage(message, {
                        level: levelMap[level] || 'info',
                        extra: meta
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
        // Console transport
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

module.exports = {
    logger,
    stream,
    error: (message, meta = {}) => logger.error(message, meta),
    warn: (message, meta = {}) => logger.warn(message, meta),
    info: (message, meta = {}) => logger.info(message, meta),
    debug: (message, meta = {}) => logger.debug(message, meta),
    http: (message, meta = {}) => logger.http(message, meta)
}; 