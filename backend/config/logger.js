const winston = require('winston');
const path = require('path');

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
    defaultMeta: { service: 'rideshare-backend' },
    transports: process.env.NODE_ENV === 'production' 
        ? [
            // In production, only log to console (for cloud logging)
            new winston.transports.Console({
                format: winston.format.json() // JSON format for cloud logging services
            })
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
            })
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
    stream
}; 