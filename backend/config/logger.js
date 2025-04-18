const winston = require('winston');
const { createLogger, format, transports } = winston;
const path = require('path');

// Custom format for sensitive data masking
const maskSensitiveData = format((info) => {
    const masked = { ...info };
    
    // List of fields to mask
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie'];
    
    // Recursive function to mask sensitive data
    const maskData = (obj) => {
        if (typeof obj !== 'object') return obj;
        
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object') {
                obj[key] = maskData(obj[key]);
            } else if (typeof obj[key] === 'string' && 
                      sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                obj[key] = '********';
            }
        });
        return obj;
    };

    return maskData(masked);
});

// Create logger instance
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        maskSensitiveData(),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.metadata(),
        format.json()
    ),
    defaultMeta: { 
        service: 'edu-guide-agent',
        environment: process.env.NODE_ENV
    },
    transports: [
        // Console logging for development
        new transports.Console({
            level: 'debug',
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        }),

        // Error logging
        new transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),

        // Combined logging
        new transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Secure audit logging for sensitive operations
logger.audit = (message, metadata) => {
    logger.info(message, {
        ...metadata,
        audit: true,
        timestamp: new Date().toISOString(),
        trace_id: metadata?.trace_id || crypto.randomBytes(16).toString('hex')
    });
};

// Security event logging
logger.security = (message, metadata) => {
    logger.warn(message, {
        ...metadata,
        security_event: true,
        timestamp: new Date().toISOString(),
        trace_id: metadata?.trace_id || crypto.randomBytes(16).toString('hex')
    });
};

// Export logger instance
module.exports = logger;
