const { Storage } = require('@google-cloud/storage');
const logger = require('./logger');

class SecureStorageConfig {
    constructor() {
        // Validate required environment variables
        const requiredEnv = [
            'GOOGLE_APPLICATION_CREDENTIALS',
            'GOOGLE_CLOUD_PROJECT',
            'GOOGLE_STORAGE_BUCKET',
            'SERVICE_ACCOUNT_EMAIL',
            'STORAGE_KMS_KEY',
            'CORS_ORIGIN'
        ];
        for (const key of requiredEnv) {
            if (!process.env[key]) {
                throw new Error(`Missing required environment variable: ${key}`);
            }
        }

        this.storage = new Storage({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.GOOGLE_CLOUD_PROJECT
        });
        this.bucketName = process.env.GOOGLE_STORAGE_BUCKET;
        this.bucket = this.storage.bucket(this.bucketName);
        this.defaultMetadata = {
            encrypted: true,
            bucketLevel: true,
            dataRetention: process.env.DATA_RETENTION_PERIOD || '730',
            dataClassification: 'confidential',
            gdprCompliant: true,
            dataRegion: process.env.STORAGE_REGION || 'europe-west1',
            accessLogging: true,
            personalDataHandling: 'encrypted',
            auditEnabled: true
        };
        // Async init moved to static method
    }

    // Static async initializer for proper async setup
    static async init() {
        const instance = new SecureStorageConfig();
        await instance._initializeSecurityConfig();
        return instance;
    }

    async _initializeSecurityConfig() {
        try {
            await Promise.all([
                this.configureBucketCors(),
                this.configureBucketIAM(),
                this.configureDefaultEncryption(),
                this.configureDataRetention(),
                this.configureAuditLogging()
            ]);
        } catch (error) {
            logger.error('Failed to initialize security configuration', { error });
            throw error;
        }
    }

    async configureBucketCors() {
        try {
            if (!process.env.CORS_ORIGIN) {
                throw new Error('CORS_ORIGIN environment variable is not set');
            }
            await this.bucket.setCorsConfiguration([
                {
                    maxAgeSeconds: 3600,
                    method: ['GET', 'HEAD', 'PUT', 'POST'],
                    origin: [process.env.CORS_ORIGIN],
                    responseHeader: [
                        'Content-Type',
                        'x-goog-meta-encryption-key-sha256',
                        'x-goog-meta-file-hash'
                    ]
                }
            ]);
            logger.info('Bucket CORS configuration updated successfully', { origin: process.env.CORS_ORIGIN });
        } catch (error) {
            logger.error('Failed to configure bucket CORS', { error, origin: process.env.CORS_ORIGIN });
            throw error;
        }
    }

    async configureBucketIAM() {
        try {
            await this.bucket.setUniformBucketLevelAccess({ enabled: true });
            const [policy] = await this.bucket.iam.getPolicy({ requestedPolicyVersion: 3 });
            // Merge new bindings with existing ones
            const viewerBinding = {
                role: 'roles/storage.objectViewer',
                members: [`serviceAccount:${process.env.SERVICE_ACCOUNT_EMAIL}`]
            };
            const creatorBinding = {
                role: 'roles/storage.objectCreator',
                members: [`serviceAccount:${process.env.SERVICE_ACCOUNT_EMAIL}`]
            };
            // Avoid duplicate roles
            policy.bindings = policy.bindings || [];
            const roles = policy.bindings.map(b => b.role);
            if (!roles.includes(viewerBinding.role)) {
                policy.bindings.push(viewerBinding);
            }
            if (!roles.includes(creatorBinding.role)) {
                policy.bindings.push(creatorBinding);
            }
            await this.bucket.iam.setPolicy(policy);
            logger.info('Bucket IAM policies updated successfully', { serviceAccount: process.env.SERVICE_ACCOUNT_EMAIL });
        } catch (error) {
            logger.error('Failed to configure bucket IAM', { error, serviceAccount: process.env.SERVICE_ACCOUNT_EMAIL });
            throw error;
        }
    }

    async configureDefaultEncryption() {
        try {
            await this.bucket.setEncryptionKey(process.env.STORAGE_KMS_KEY);
            logger.info('Default encryption configured successfully', { kmsKey: process.env.STORAGE_KMS_KEY });
        } catch (error) {
            logger.error('Failed to configure default encryption', { error, kmsKey: process.env.STORAGE_KMS_KEY });
            throw error;
        }
    }

    async configureDataRetention() {
        try {
            // GCS expects seconds, not ms
            const retentionSeconds = parseInt(this.defaultMetadata.dataRetention) * 24 * 60 * 60;
            await this.bucket.setRetentionPeriod({ retentionPeriod: retentionSeconds });
            logger.info('Data retention policy configured successfully', { retentionSeconds });
        } catch (error) {
            logger.error('Failed to configure data retention', { error, retention: this.defaultMetadata.dataRetention });
            throw error;
        }
    }

    async configureAuditLogging() {
        try {
            await this.bucket.setAuditConfigs([{
                service: 'storage.googleapis.com',
                auditLogConfigs: [
                    { logType: 'ADMIN_READ' },
                    { logType: 'DATA_READ' },
                    { logType: 'DATA_WRITE' }
                ]
            }]);
            logger.info('Audit logging configured successfully');
        } catch (error) {
            logger.error('Failed to configure audit logging', { error });
            throw error;
        }
    }

    async createSecureUploadUrl(fileName, contentType, metadata = {}) {
        try {
            const options = {
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType,
                metadata: {
                    ...this.defaultMetadata,
                    ...metadata
                }
            };

            const [url] = await this.bucket.file(fileName).getSignedUrl(options);
            return url;
        } catch (error) {
            logger.error('Failed to create secure upload URL', { error, fileName });
            throw error;
        }
    }

    async createSecureDownloadUrl(fileName, expiresInMinutes = 15) {
        try {
            const options = {
                version: 'v4',
                action: 'read',
                expires: Date.now() + expiresInMinutes * 60 * 1000
            };

            const [url] = await this.bucket.file(fileName).getSignedUrl(options);
            return url;
        } catch (error) {
            logger.error('Failed to create secure download URL', { error, fileName });
            throw error;
        }
    }

    async deleteFile(fileName) {
        try {
            await this.bucket.file(fileName).delete();
            logger.info('File deleted successfully', { fileName });
        } catch (error) {
            logger.error('Failed to delete file', { error, fileName });
            throw error;
        }
    }

    async listFiles(prefix = '') {
        try {
            const [files] = await this.bucket.getFiles({ prefix });
            return files.map(file => ({
                name: file.name,
                metadata: file.metadata
            }));
        } catch (error) {
            logger.error('Failed to list files', { error, prefix });
            throw error;
        }
    }

    async uploadFile(file, metadata = {}) {
        try {
            const gdprMetadata = {
                ...this.defaultMetadata,
                ...metadata,
                personalData: metadata.containsPersonalData || false,
                dataSubjectRights: 'enabled',
                legalBasis: metadata.legalBasis || 'consent',
                retentionPeriod: metadata.retentionPeriod || this.defaultMetadata.dataRetention,
                dataController: process.env.DATA_CONTROLLER,
                lastModified: new Date().toISOString()
            };

            const options = {
                metadata: gdprMetadata,
                validation: 'crc32c',
                resumable: true,
                predefinedAcl: 'private'
            };

            await this.bucket.upload(file.path, options);
            logger.audit('File uploaded with GDPR compliance', {
                fileName: file.name,
                metadata: gdprMetadata
            });

            return { success: true, metadata: gdprMetadata };
        } catch (error) {
            logger.error('File upload failed', { error });
            throw error;
        }
    }

    async handleDataSubjectRequest(userId, requestType) {
        try {
            switch (requestType) {
                case 'access':
                    return await this._handleDataAccess(userId);
                case 'delete':
                    return await this._handleDataDeletion(userId);
                case 'export':
                    return await this._handleDataExport(userId);
                default:
                    throw new Error('Invalid request type');
            }
        } catch (error) {
            logger.error('Data subject request failed', { error, userId, requestType });
            throw error;
        }
    }

    async _handleDataAccess(userId) {
        // Implement GDPR data access request
        const [files] = await this.bucket.getFiles({
            prefix: `users/${userId}/`
        });
        return files.map(file => ({
            name: file.name,
            metadata: file.metadata,
            created: file.metadata.timeCreated
        }));
    }

    async _handleDataDeletion(userId) {
        // Implement GDPR right to be forgotten
        const [files] = await this.bucket.getFiles({
            prefix: `users/${userId}/`
        });
        
        await Promise.all(files.map(file => file.delete()));
        logger.audit('User data deleted', { userId });
        return { success: true, deletedCount: files.length };
    }

    async _handleDataExport(userId) {
        // Implement GDPR data portability
        const [files] = await this.bucket.getFiles({
            prefix: `users/${userId}/`
        });
        
        const exportData = await Promise.all(files.map(async file => {
            const [data] = await file.download();
            return {
                name: file.name,
                content: data,
                metadata: file.metadata
            };
        }));

        logger.audit('User data exported', { userId });
        return exportData;
    }

    // New: Get file metadata
    async getFileMetadata(fileName) {
        try {
            const [metadata] = await this.bucket.file(fileName).getMetadata();
            return metadata;
        } catch (error) {
            logger.error('Failed to get file metadata', { error, fileName });
            throw error;
        }
    }

    // New: Generate signed URL for file deletion
    async createSecureDeleteUrl(fileName, expiresInMinutes = 15) {
        try {
            const options = {
                version: 'v4',
                action: 'delete',
                expires: Date.now() + expiresInMinutes * 60 * 1000
            };
            const [url] = await this.bucket.file(fileName).getSignedUrl(options);
            return url;
        } catch (error) {
            logger.error('Failed to create secure delete URL', { error, fileName });
            throw error;
        }
    }

    // New: List file versions (if versioning enabled)
    async listFileVersions(fileName) {
        try {
            const [versions] = await this.bucket.file(fileName).getMetadata({ generation: true });
            return versions;
        } catch (error) {
            logger.error('Failed to list file versions', { error, fileName });
            throw error;
        }
    }

    // New: Set file public/private
    async setFilePublic(fileName, isPublic = true) {
        try {
            const file = this.bucket.file(fileName);
            if (isPublic) {
                await file.makePublic();
            } else {
                await file.makePrivate({ strict: true });
            }
            logger.info('File access updated', { fileName, isPublic });
            return { success: true, isPublic };
        } catch (error) {
            logger.error('Failed to update file access', { error, fileName, isPublic });
            throw error;
        }
    }

    // New: Upload file with versioning (if enabled)
    async uploadVersionedFile(file, metadata = {}) {
        try {
            const options = {
                metadata: { ...this.defaultMetadata, ...metadata },
                validation: 'crc32c',
                resumable: true,
                predefinedAcl: 'private',
                // GCS will automatically create a new generation/version
            };
            const [uploadedFile] = await this.bucket.upload(file.path, options);
            logger.audit('Versioned file uploaded', { fileName: file.name, metadata: options.metadata });
            return uploadedFile;
        } catch (error) {
            logger.error('Versioned file upload failed', { error });
            throw error;
        }
    }

    // New: Download throttling (rate limit signed URL generation)
    async createThrottledDownloadUrl(fileName, expiresInMinutes = 15, rateLimitPerMinute = 5) {
        // This is a placeholder; real throttling should be enforced at API or proxy level
        return this.createSecureDownloadUrl(fileName, expiresInMinutes);
    }

    // New: Event hooks (simple callback support)
    setEventHook(event, callback) {
        if (!this._eventHooks) this._eventHooks = {};
        if (!this._eventHooks[event]) this._eventHooks[event] = [];
        this._eventHooks[event].push(callback);
    }
    async _triggerEvent(event, ...args) {
        if (this._eventHooks && Array.isArray(this._eventHooks[event])) {
            for (const cb of this._eventHooks[event]) {
                try {
                    await cb(...args);
                } catch (e) {
                    logger.error('Event hook error', { event, error: e });
                }
            }
        }
    }

    // Streaming upload for large files
    async uploadFileStream(readStream, fileName, metadata = {}) {
        try {
            const gdprMetadata = {
                ...this.defaultMetadata,
                ...metadata,
                lastModified: new Date().toISOString()
            };
            const file = this.bucket.file(fileName);
            const stream = file.createWriteStream({
                metadata: gdprMetadata,
                resumable: true,
                validation: 'crc32c',
                predefinedAcl: 'private'
            });
            await new Promise((resolve, reject) => {
                readStream.pipe(stream)
                    .on('error', reject)
                    .on('finish', resolve);
            });
            logger.audit('File uploaded via stream', { fileName, metadata: gdprMetadata });
            await this._triggerEvent('upload', fileName, gdprMetadata);
            return { success: true, metadata: gdprMetadata };
        } catch (error) {
            logger.error('Stream upload failed', { error, fileName });
            throw error;
        }
    }

    // Streaming download for large files
    async downloadFileStream(fileName) {
        try {
            const file = this.bucket.file(fileName);
            const readStream = file.createReadStream();
            await this._triggerEvent('download', fileName);
            return readStream;
        } catch (error) {
            logger.error('Stream download failed', { error, fileName });
            throw error;
        }
    }

    // Centralized error handling utility
    static handleError(error, context = {}) {
        logger.error('Storage error', { error, ...context });
        // Optionally, throw custom error classes here
        throw error;
    }

    // Generate and validate short-lived access tokens for file operations
    static generateAccessToken(expiryMinutes = 15) {
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = Date.now() + expiryMinutes * 60 * 1000;
        return { token, expiresAt };
    }
    static validateAccessToken(tokenObj) {
        return tokenObj && tokenObj.token && tokenObj.expiresAt > Date.now();
    }

    // Monitoring and metrics (simple logging, can be extended)
    logMetric(event, details = {}) {
        logger.info('Storage metric', { event, ...details });
    }

    // Archive previous version metadata on upload
    async archivePreviousVersion(fileName, newMetadata) {
        try {
            const file = this.bucket.file(fileName);
            const [metadata] = await file.getMetadata();
            if (metadata) {
                // Store previous version info (could be in DB or a log)
                logger.audit('File version archived', { fileName, previous: metadata, new: newMetadata });
            }
        } catch (error) {
            logger.error('Failed to archive previous version', { error, fileName });
        }
    }
}

// Export async-initialized singleton
let storageInstancePromise = SecureStorageConfig.init();
module.exports = storageInstancePromise;

// --- Usage Examples & Integration Guidance ---
// Usage: Get the initialized storage instance
// const storagePromise = require('./config/storage');
// storagePromise.then(storage => { ... });

// Example: Streaming upload
// const fs = require('fs');
// storagePromise.then(async storage => {
//   const readStream = fs.createReadStream('/path/to/large.pdf');
//   await storage.uploadFileStream(readStream, 'uploads/large.pdf', { uploadedBy: 'user123' });
// });

// Example: Streaming download
// storagePromise.then(async storage => {
//   const readStream = await storage.downloadFileStream('uploads/large.pdf');
//   readStream.pipe(fs.createWriteStream('/tmp/downloaded.pdf'));
// });

// Example: Event hooks
// storagePromise.then(storage => {
//   storage.setEventHook('upload', (fileName, metadata) => {
//     console.log('File uploaded:', fileName, metadata);
//   });
// });

// Example: Access token generation/validation
// const { token, expiresAt } = SecureStorageConfig.generateAccessToken(10); // 10 min expiry
// const isValid = SecureStorageConfig.validateAccessToken({ token, expiresAt });

// Example: Archive previous version before upload
// storagePromise.then(async storage => {
//   await storage.archivePreviousVersion('uploads/large.pdf', { updatedBy: 'user123' });
// });

// Example: Logging metrics
// storagePromise.then(storage => {
//   storage.logMetric('upload', { fileName: 'uploads/large.pdf', user: 'user123' });
// });

// Example: Centralized error handling
// try {
//   ...
// } catch (err) {
//   SecureStorageConfig.handleError(err, { context: 'upload' });
// }

// Example: Secure signed URLs
// storagePromise.then(async storage => {
//   const url = await storage.createSecureUploadUrl('uploads/large.pdf', 'application/pdf');
//   // Use this URL for client-side upload
// });

// Example: GDPR data subject request
// storagePromise.then(async storage => {
//   const files = await storage.handleDataSubjectRequest('user123', 'access');
// });

// For more advanced integration, see the documentation for Google Cloud Storage Node.js SDK.
