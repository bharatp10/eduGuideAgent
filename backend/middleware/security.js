const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const sanitize = require('sanitize-filename');
const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');
const { body, validationResult, param, query } = require('express-validator');

// Rate limiting configuration
const rateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Secure file upload configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE),
        files: parseInt(process.env.MAX_FILES_PER_REQUEST)
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (!process.env.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
            return cb(new Error('Invalid file type'), false);
        }
        
        // Check filename for security
        const sanitizedName = sanitize(file.originalname);
        if (sanitizedName !== file.originalname) {
            return cb(new Error('Invalid filename'), false);
        }

        // Additional security checks
        if (file.originalname.includes('../')) {
            return cb(new Error('Invalid filename'), false);
        }

        cb(null, true);
    }
});

// CORS configuration with security options
const corsOptions = {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 600 // 10 minutes
};

// Helmet configuration for security headers
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', process.env.GOOGLE_STORAGE_BUCKET],
            connectSrc: ["'self'", process.env.GOOGLE_STORAGE_BUCKET],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
};

// Request validation middleware
const validateRequest = (req, res, next) => {
    // Validate Content-Type
    if (req.method !== 'GET' && !req.is('application/json') && !req.is('multipart/form-data')) {
        return res.status(415).json({ error: 'Unsupported Media Type' });
    }

    // Validate request size (only if content-length header is present and valid)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE);
    const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : null;
    if (contentLength && !isNaN(contentLength) && contentLength > maxSize) {
        return res.status(413).json({ error: 'Payload Too Large' });
    }

    // Validate and sanitize query and body (basic example)
    // You can add more specific validators in your route files
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        }
    }

    next();
};

// Token validation middleware
const validateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify token and extract user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Anti-CSRF token middleware
const csrfProtection = (req, res, next) => {
    const token = req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next();
};

// Generate secure request ID
const requestId = (req, res, next) => {
    req.id = crypto.randomBytes(16).toString('hex');
    res.setHeader('X-Request-ID', req.id);
    next();
};

// Audit logging middleware
const auditLog = async (req, res, next) => {
    if (process.env.ENABLE_AUDIT_LOGGING === 'true') {
        const log = {
            timestamp: new Date(),
            requestId: req.id,
            method: req.method,
            path: req.path,
            ip: req.ip,
            userId: req.user?.id || 'anonymous',
            userAgent: req.headers['user-agent']
        };
        // Store in DB as well as console.log
        try {
            await AuditLog.create(log);
        } catch (e) {
            // Fallback to console if DB fails
            console.log('Audit DB error:', e);
        }
        console.log('Audit:', JSON.stringify(log));
    }
    next();
};

module.exports = {
    rateLimiter,
    upload,
    corsOptions,
    helmetConfig,
    validateRequest,
    validateToken,
    csrfProtection,
    requestId,
    auditLog
};