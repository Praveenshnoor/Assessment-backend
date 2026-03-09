/**
 * Structured Logging with Pino
 * High-performance JSON logger for production
 */

const pino = require('pino');

// Create logger instance
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    
    // Production: JSON format
    // Development: Pretty format
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        }
    } : undefined,
    
    // Base configuration
    base: {
        env: process.env.NODE_ENV || 'development',
    },
    
    // Timestamp
    timestamp: pino.stdTimeFunctions.isoTime,
    
    // Serializers for common objects
    serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
    },
});

// Express middleware for request logging
const expressLogger = require('pino-http')({
    logger,
    autoLogging: true,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
});

module.exports = { logger, expressLogger };
