require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const databaseConfig = require('./config/database');
const logger = require('./config/logger');
const securityMiddleware = require('./middleware/security');

// Initialize express app
const app = express();
const port = process.env.PORT || 5001;

// Security middleware
app.use(helmet(securityMiddleware.helmetConfig));
app.use(cors(securityMiddleware.corsOptions));
app.use(securityMiddleware.rateLimiter);
app.use(securityMiddleware.validateRequest);
app.use(securityMiddleware.requestId);
app.use(securityMiddleware.auditLog);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/documents', require('./routes/documents'));
app.use('/api/audit', require('./routes/audit'));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err });
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
    try {
        // Connect to database
        await databaseConfig.connect();
        
        // Create indexes
        await databaseConfig.createIndexes();
        
        // Start server
        app.listen(port, () => {
            logger.info(`Server running on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Starting graceful shutdown...');
    await databaseConfig.gracefulShutdown();
});

startServer();
