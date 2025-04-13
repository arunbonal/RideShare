const winston = require('winston');
const path = require('path');
const Sentry = require("@sentry/node");

// Custom Sentry transport for Winston
class SentryTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    const { level, message, ...meta } = info;
    
    // Map Winston log levels to Sentry levels
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
      Sentry.captureException(message);
    } else {
      Sentry.captureMessage(message, {
        level: levelMap[level] || 'info',
        extra: meta
      });
    }

    callback();
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
    defaultMeta: { service: 'rideshare-backend', environment: process.env.NODE_ENV },
    transports: process.env.NODE_ENV === 'production' 
        ? [
            // In production, only log to console (for cloud logging)
            new winston.transports.Console({
                format: winston.format.json() // JSON format for cloud logging services
            }),
            // Sentry transport
            new SentryTransport()
        ]
        : [
            // In development, log to console and files
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }),
            new winston.transports.File({
                filename: path.join(__dirname, '../logs/error.log'),
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            new winston.transports.File({
                filename: path.join(__dirname, '../logs/combined.log'),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            // Sentry transport
            new SentryTransport()
        ],
    // Handle uncaught exceptions and unhandled rejections
    exceptionHandlers: process.env.NODE_ENV === 'production'
        ? [new winston.transports.Console()]
        : [
            new winston.transports.File({
                filename: path.join(__dirname, '../logs/exceptions.log'),
                maxsize: 5242880,
                maxFiles: 5,
            })
        ],
    rejectionHandlers: process.env.NODE_ENV === 'production'
        ? [new winston.transports.Console()]
        : [
            new winston.transports.File({
                filename: path.join(__dirname, '../logs/rejections.log'),
                maxsize: 5242880,
                maxFiles: 5,
            })
        ]
});

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