const { Storage } = require('@google-cloud/storage');
const { MongoClient } = require('mongodb');
const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SecureBackup {
    constructor() {
        this.storage = new Storage({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.GOOGLE_CLOUD_PROJECT
        });
        this.backupBucket = this.storage.bucket(process.env.BACKUP_BUCKET);
    }

    async createBackup() {
        const timestamp = new Date().toISOString();
        const backupId = crypto.randomBytes(16).toString('hex');
        const backupPath = path.join('tmp', `backup-${timestamp}-${backupId}`);

        try {
            // Create encrypted MongoDB dump
            const encryptionKey = crypto.randomBytes(32);
            await this.createEncryptedDump(backupPath, encryptionKey);

            // Upload to Cloud Storage with encryption
            await this.uploadBackup(backupPath, timestamp, backupId, encryptionKey);

            // Cleanup
            await execAsync(`rm -rf ${backupPath}`);

            return {
                status: 'success',
                backupId,
                timestamp
            };
        } catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    }

    async createEncryptedDump(backupPath, encryptionKey) {
        // Create MongoDB dump
        await execAsync(`mongodump --uri="${process.env.MONGO_URI}" --out=${backupPath}`);

        // Encrypt the dump
        const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, crypto.randomBytes(16));
        await execAsync(`tar czf - ${backupPath} | ${cipher.update.bind(cipher)} > ${backupPath}.enc`);
    }

    async uploadBackup(backupPath, timestamp, backupId, encryptionKey) {
        const metadata = {
            timestamp,
            backupId,
            encryptionKeyHash: crypto.createHash('sha256').update(encryptionKey).digest('hex')
        };

        await this.backupBucket.upload(`${backupPath}.enc`, {
            destination: `backups/${timestamp}-${backupId}.enc`,
            metadata: {
                metadata
            },
            encryption: {
                kmsKeyName: process.env.BACKUP_KMS_KEY
            }
        });
    }

    async restoreBackup(backupId, encryptionKey) {
        try {
            const [files] = await this.backupBucket.getFiles({
                prefix: `backups/${backupId}`
            });

            if (files.length === 0) {
                throw new Error('Backup not found');
            }

            const backupFile = files[0];
            const tempPath = path.join('tmp', `restore-${backupId}`);

            // Download and decrypt backup
            await backupFile.download({ destination: `${tempPath}.enc` });
            const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, crypto.randomBytes(16));
            await execAsync(`cat ${tempPath}.enc | ${decipher.update.bind(decipher)} | tar xzf -`);

            // Restore to MongoDB
            await execAsync(`mongorestore --uri="${process.env.MONGO_URI}" --drop ${tempPath}`);

            // Cleanup
            await execAsync(`rm -rf ${tempPath}*`);

            return {
                status: 'success',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }

    async listBackups() {
        const [files] = await this.backupBucket.getFiles({
            prefix: 'backups/'
        });

        return files.map(file => file.metadata.metadata);
    }

    async deleteBackup(backupId) {
        const [files] = await this.backupBucket.getFiles({
            prefix: `backups/${backupId}`
        });

        if (files.length === 0) {
            throw new Error('Backup not found');
        }

        await Promise.all(files.map(file => file.delete()));

        return {
            status: 'success',
            message: `Backup ${backupId} deleted`
        };
    }
}

module.exports = new SecureBackup();
