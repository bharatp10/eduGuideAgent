const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');
const configPromise = require('../config/storage');

class DocumentStorageService {
    async uploadDocument(file, metadata) {
        try {
            const config = await configPromise;
            const bucket = config.bucket;
            // Generate a unique filename
            const fileHash = crypto.createHash('md5')
                .update(file.buffer)
                .digest('hex');
            const ext = path.extname(file.originalname);
            const filename = `${fileHash}-${Date.now()}${ext}`;

            // Create a new blob in the bucket
            const blob = bucket.file(filename);

            // Upload the file data
            await blob.save(file.buffer, {
                contentType: metadata.contentType,
                metadata: {
                    uploadedBy: metadata.uploadedBy,
                    originalName: file.originalname,
                    uploadDate: new Date().toISOString()
                }
            });

            // Make the file public and get its URL
            await blob.makePublic();
            const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${filename}`;

            logger.info('Document uploaded successfully', { filename });

            return {
                filename,
                publicUrl,
                contentType: metadata.contentType,
                size: file.size
            };
        } catch (error) {
            logger.error('Document upload failed', { error });
            throw new Error('Failed to upload document to storage');
        }
    }

    async deleteDocument(filename) {
        try {
            const config = await configPromise;
            const bucket = config.bucket;
            const file = bucket.file(filename);
            await file.delete();
            logger.info('Document deleted successfully', { filename });
        } catch (error) {
            logger.error('Document deletion failed', { error });
            throw new Error('Failed to delete document from storage');
        }
    }

    async getSignedUrl(filename, expiresIn = 3600) {
        try {
            const config = await configPromise;
            const bucket = config.bucket;
            const file = bucket.file(filename);
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + expiresIn * 1000
            });
            return url;
        } catch (error) {
            logger.error('Failed to generate signed URL', { error });
            throw new Error('Failed to generate signed URL');
        }
    }

    async moveDocument(oldFilename, newFilename) {
        try {
            const config = await configPromise;
            const bucket = config.bucket;
            const sourceFile = bucket.file(oldFilename);
            const destinationFile = bucket.file(newFilename);
            await sourceFile.move(destinationFile);
            await destinationFile.makePublic();
            const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${newFilename}`;
            logger.info('Document moved successfully', { oldFilename, newFilename });
            return {
                filename: newFilename,
                publicUrl
            };
        } catch (error) {
            logger.error('Document move failed', { error });
            throw new Error('Failed to move document in storage');
        }
    }
}

module.exports = new DocumentStorageService();