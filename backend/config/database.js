const mongoose = require('mongoose');
const logger = require('./logger');

class DatabaseConfig {
    constructor() {
        this.options = {
            autoIndex: true,
            minPoolSize: 5,
            maxPoolSize: 10,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4,
            authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
            ssl: process.env.NODE_ENV === 'production',
            sslValidate: true,
            retryWrites: true,
            w: 'majority'
        };

        if (process.env.NODE_ENV === 'production') {
            this.options.sslCA = process.env.MONGO_SSL_CA;
            this.options.sslCert = process.env.MONGO_SSL_CERT;
            this.options.sslKey = process.env.MONGO_SSL_KEY;
        }

        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connected successfully');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error', { error: err });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        // Handle application termination
        process.on('SIGINT', this.gracefulShutdown.bind(this));
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
    }

    async connect() {
        try {
            await mongoose.connect(process.env.MONGO_URI, {
                ...this.options,
                user: process.env.MONGO_USER,
                pass: process.env.MONGO_PASSWORD
            });

            // Create indexes after connection
            await this.createIndexes();
        } catch (error) {
            logger.error('Failed to connect to MongoDB', { error });
            throw error;
        }
    }

    async createIndexes() {
        try {
            // Get all models
            const models = mongoose.modelNames();
            
            for (const modelName of models) {
                const model = mongoose.model(modelName);
                await model.createIndexes();
            }
            
            logger.info('Database indexes created successfully');
        } catch (error) {
            logger.error('Failed to create indexes', { error });
            throw error;
        }
    }

    async gracefulShutdown() {
        try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown', { error });
            process.exit(1);
        }
    }

    // Method to create a new database user with specific roles
    async createDatabaseUser(username, password, roles) {
        try {
            const db = mongoose.connection.db;
            await db.addUser(username, password, {
                roles: roles || ['readWrite']
            });
            logger.info('Database user created successfully');
        } catch (error) {
            logger.error('Failed to create database user', { error });
            throw error;
        }
    }

    // Method to verify database connection and permissions
    async verifyConnection() {
        try {
            await mongoose.connection.db.command({ ping: 1 });
            logger.info('Database connection verified successfully');
            return true;
        } catch (error) {
            logger.error('Database connection verification failed', { error });
            return false;
        }
    }
}

module.exports = new DatabaseConfig();
