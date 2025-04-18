const crypto = require('crypto');
const { promisify } = require('util');
const logger = require('../config/logger');

class EncryptionService {
    constructor() {
        this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
        this.keyLength = parseInt(process.env.FILE_ENCRYPTION_KEY_LENGTH) || 32;
    }

    async encryptFile(buffer) {
        try {
            // Generate a unique key and IV for each encryption
            const key = crypto.randomBytes(this.keyLength);
            const iv = crypto.randomBytes(16);

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);

            // Encrypt the file
            const encryptedBuffers = [];
            encryptedBuffers.push(cipher.update(buffer));
            encryptedBuffers.push(cipher.final());

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            // Combine IV, encrypted content, and auth tag
            const encryptedBuffer = Buffer.concat([
                iv,
                Buffer.concat(encryptedBuffers),
                authTag
            ]);

            // Generate metadata
            const metadata = {
                encryptionKey: key.toString('hex'),
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                algorithm: this.algorithm,
                timestamp: new Date().toISOString()
            };

            logger.audit('File encrypted successfully', {
                action: 'file_encryption',
                fileHash: crypto.createHash('sha256').update(buffer).digest('hex')
            });

            return { encryptedBuffer, metadata };
        } catch (error) {
            logger.error('File encryption failed', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('Encryption failed');
        }
    }

    async decryptFile(encryptedBuffer, metadata) {
        try {
            // Extract encryption parameters
            const key = Buffer.from(metadata.encryptionKey, 'hex');
            const iv = Buffer.from(metadata.iv, 'hex');
            const authTag = Buffer.from(metadata.authTag, 'hex');

            // Create decipher
            const decipher = crypto.createDecipheriv(metadata.algorithm, key, iv);
            decipher.setAuthTag(authTag);

            // Decrypt the file
            const decryptedBuffers = [];
            decryptedBuffers.push(decipher.update(encryptedBuffer));
            decryptedBuffers.push(decipher.final());

            const decryptedBuffer = Buffer.concat(decryptedBuffers);

            logger.audit('File decrypted successfully', {
                action: 'file_decryption',
                fileHash: crypto.createHash('sha256').update(decryptedBuffer).digest('hex')
            });

            return decryptedBuffer;
        } catch (error) {
            logger.error('File decryption failed', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('Decryption failed');
        }
    }

    // Generate secure token for file access
    generateAccessToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Verify file integrity
    async verifyFileIntegrity(buffer, originalHash) {
        const currentHash = crypto.createHash('sha256').update(buffer).digest('hex');
        return currentHash === originalHash;
    }

    // Rotate encryption keys
    async rotateEncryptionKey(encryptedBuffer, oldMetadata) {
        // Decrypt with old key
        const decryptedBuffer = await this.decryptFile(encryptedBuffer, oldMetadata);
        
        // Re-encrypt with new key
        return await this.encryptFile(decryptedBuffer);
    }
}

module.exports = new EncryptionService();
