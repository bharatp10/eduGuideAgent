const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../config/logger');
const storageConfig = require('../config/storage');
const encryptionService = require('./encryptionService');

class VersionControl {
    constructor() {
        this.versionSchema = new mongoose.Schema({
            resourceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Resource',
                required: true,
                index: true
            },
            version: {
                type: Number,
                required: true
            },
            storageKey: {
                type: String,
                required: true
            },
            fileHash: {
                type: String,
                required: true
            },
            encryptionMetadata: {
                type: Object,
                required: true
            },
            changeType: {
                type: String,
                enum: ['create', 'update', 'metadata'],
                required: true
            },
            metadata: {
                lastModified: Date,
                size: Number,
                mimeType: String,
                modifiedBy: String
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        });

        this.VersionModel = mongoose.model('Version', this.versionSchema);
    }

    async createVersion(resource, file, changeType = 'create') {
        try {
            // Generate file hash
            const fileHash = crypto
                .createHash('sha256')
                .update(file.buffer)
                .digest('hex');

            // Encrypt file
            const { encryptedBuffer, metadata: encryptionMetadata } = 
                await encryptionService.encryptFile(file.buffer);

            // Generate unique storage key
            const storageKey = `${resource._id}/${fileHash}-v${resource.version}`;

            // Upload encrypted file to storage
            await storageConfig.bucket
                .file(storageKey)
                .save(encryptedBuffer, {
                    metadata: {
                        encryptionMetadata,
                        contentType: file.mimetype,
                        fileHash
                    }
                });

            // Create version record
            const version = await this.VersionModel.create({
                resourceId: resource._id,
                version: resource.version,
                storageKey,
                fileHash,
                encryptionMetadata,
                changeType,
                metadata: {
                    lastModified: new Date(),
                    size: file.size,
                    mimeType: file.mimetype,
                    modifiedBy: resource.lastModifiedBy
                }
            });

            logger.audit('New version created', {
                resourceId: resource._id,
                version: version.version,
                changeType
            });

            return version;
        } catch (error) {
            logger.error('Failed to create version', { error });
            throw error;
        }
    }

    async getVersion(resourceId, versionNumber) {
        try {
            const version = await this.VersionModel
                .findOne({ resourceId, version: versionNumber });

            if (!version) {
                throw new Error('Version not found');
            }

            // Get file from storage
            const file = storageConfig.bucket.file(version.storageKey);
            const [fileContent] = await file.download();

            // Decrypt file
            const decryptedBuffer = await encryptionService
                .decryptFile(fileContent, version.encryptionMetadata);

            return {
                version,
                content: decryptedBuffer
            };
        } catch (error) {
            logger.error('Failed to retrieve version', { error });
            throw error;
        }
    }

    async listVersions(resourceId) {
        try {
            return await this.VersionModel
                .find({ resourceId })
                .sort({ version: -1 });
        } catch (error) {
            logger.error('Failed to list versions', { error });
            throw error;
        }
    }

    async compareVersions(resourceId, version1, version2) {
        try {
            const [v1, v2] = await Promise.all([
                this.getVersion(resourceId, version1),
                this.getVersion(resourceId, version2)
            ]);

            return {
                v1Hash: v1.version.fileHash,
                v2Hash: v2.version.fileHash,
                isDifferent: v1.version.fileHash !== v2.version.fileHash,
                metadata: {
                    v1: v1.version.metadata,
                    v2: v2.version.metadata
                }
            };
        } catch (error) {
            logger.error('Failed to compare versions', { error });
            throw error;
        }
    }

    async revertToVersion(resourceId, versionNumber) {
        try {
            const oldVersion = await this.getVersion(resourceId, versionNumber);
            const resource = await mongoose.model('Resource')
                .findById(resourceId);

            if (!resource) {
                throw new Error('Resource not found');
            }

            // Create new version with old content
            const file = {
                buffer: oldVersion.content,
                mimetype: oldVersion.version.metadata.mimeType,
                size: oldVersion.version.metadata.size
            };

            // Increment version and create new version
            resource.version += 1;
            const newVersion = await this.createVersion(resource, file, 'update');

            // Update resource
            resource.storageKey = newVersion.storageKey;
            resource.fileHash = newVersion.fileHash;
            await resource.save();

            logger.audit('Reverted to version', {
                resourceId,
                fromVersion: versionNumber,
                toVersion: resource.version
            });

            return resource;
        } catch (error) {
            logger.error('Failed to revert version', { error });
            throw error;
        }
    }

    async pruneVersions(resourceId, retainCount = 5) {
        try {
            const versions = await this.VersionModel
                .find({ resourceId })
                .sort({ version: -1 });

            if (versions.length <= retainCount) {
                return;
            }

            const versionsToDelete = versions.slice(retainCount);
            
            // Delete files from storage
            await Promise.all(versionsToDelete.map(async (version) => {
                await storageConfig.bucket
                    .file(version.storageKey)
                    .delete()
                    .catch(err => logger.warn('Failed to delete version file', { err }));
            }));

            // Delete version records
            await this.VersionModel.deleteMany({
                _id: { $in: versionsToDelete.map(v => v._id) }
            });

            logger.audit('Pruned old versions', {
                resourceId,
                deletedCount: versionsToDelete.length
            });
        } catch (error) {
            logger.error('Failed to prune versions', { error });
            throw error;
        }
    }
}

module.exports = new VersionControl();
