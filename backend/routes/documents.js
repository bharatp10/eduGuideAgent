const express = require('express');
const router = express.Router();
const { validateToken, upload } = require('../middleware/security');
const documentStorage = require('../services/documentStorage');
const documentProcessor = require('../services/documentProcessor');
const searchService = require('../services/searchService');
const versionControl = require('../services/versionControl');
const recommendationEngine = require('../services/recommendationEngine');
const Resource = require('../models/Resource');
const logger = require('../config/logger');

// Upload new document
router.post('/upload', validateToken, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Store document in cloud storage
        const storageResult = await documentStorage.uploadDocument(file, {
            uploadedBy: req.user.id,
            contentType: file.mimetype
        });

        // Process document for AI/ML features
        const processedData = await documentProcessor.processDocument({
            data: file.buffer,
            name: file.originalname,
            mimetype: file.mimetype
        });

        // Create resource record
        const resource = new Resource({
            type: req.body.type,
            subject: req.body.subject,
            grade: parseInt(req.body.grade),
            title: req.body.title,
            year: parseInt(req.body.year),
            storageKey: storageResult.filename,
            publicUrl: storageResult.publicUrl,
            contentMetadata: processedData.metadata,
            mimeType: file.mimetype,
            fileSize: file.size,
            lastModifiedBy: req.user.id
        });

        await resource.save();

        // Create initial version
        await versionControl.createVersion(resource, file, 'create');

        logger.audit('Document uploaded and processed successfully', {
            resourceId: resource._id,
            userId: req.user.id
        });

        res.status(201).json({
            message: 'Document uploaded and processed successfully',
            resource: {
                id: resource._id,
                title: resource.title,
                type: resource.type,
                url: storageResult.publicUrl
            }
        });
    } catch (error) {
        logger.error('Document upload failed', { error });
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// Semantic search endpoint
router.post('/search', validateToken, async (req, res) => {
    try {
        const { query, limit = 5 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Perform semantic search
        const searchResults = await searchService.semanticSearch(query, limit);

        // Fetch full resource details for matched documents
        const enrichedResults = await Promise.all(
            searchResults.map(async (result) => {
                const resource = await Resource.findOne({ 
                    'storageKey': result.filename.split('-chunk-')[0] 
                });
                
                return {
                    score: result.score,
                    resource: resource ? {
                        id: resource._id,
                        title: resource.title,
                        type: resource.type,
                        subject: resource.subject,
                        grade: resource.grade,
                        url: resource.publicUrl
                    } : null
                };
            })
        );

        // Filter out any null results
        const validResults = enrichedResults.filter(r => r.resource !== null);

        res.json({
            results: validResults
        });
    } catch (error) {
        logger.error('Semantic search failed', { error });
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get document with secure access
router.get('/:id', validateToken, async (req, res) => {
    try {
        const resource = await Resource.findByIdAndVerify(req.params.id, req.query.accessToken);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Generate temporary download URL
        const downloadUrl = await documentStorage.createSecureDownloadUrl(
            resource.storageKey,
            15 // URL expires in 15 minutes
        );

        logger.audit('Document accessed', {
            resourceId: resource._id,
            userId: req.user.id
        });

        res.json({
            resource: {
                ...resource.toObject(),
                downloadUrl
            }
        });
    } catch (error) {
        logger.error('Document access failed', { error });
        res.status(500).json({ error: 'Failed to access document' });
    }
});

// Get document recommendations
router.get('/:id/recommendations', validateToken, async (req, res) => {
    try {
        const recommendations = await recommendationEngine.getRecommendations(
            req.params.id,
            {
                gradeRange: req.query.gradeRange?.split(',').map(Number),
                subjectMatch: req.query.subjectMatch === 'true',
                typeMatch: req.query.typeMatch === 'true'
            }
        );

        res.json({ recommendations });
    } catch (error) {
        logger.error('Failed to get recommendations', { error });
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// Get document versions
router.get('/:id/versions', validateToken, async (req, res) => {
    try {
        const versions = await versionControl.listVersions(req.params.id);
        res.json({ versions });
    } catch (error) {
        logger.error('Failed to list versions', { error });
        res.status(500).json({ error: 'Failed to list versions' });
    }
});

// Revert to specific version
router.post('/:id/revert/:version', validateToken, async (req, res) => {
    try {
        const resource = await versionControl.revertToVersion(
            req.params.id,
            parseInt(req.params.version)
        );

        logger.audit('Document reverted to version', {
            resourceId: req.params.id,
            version: req.params.version,
            userId: req.user.id
        });

        res.json({ message: 'Document reverted successfully', resource });
    } catch (error) {
        logger.error('Failed to revert version', { error });
        res.status(500).json({ error: 'Failed to revert version' });
    }
});

// Delete document
router.delete('/:id', validateToken, async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Delete from storage
        await documentStorage.deleteFile(resource.storageKey);

        // Delete resource record
        await resource.remove();

        logger.audit('Document deleted', {
            resourceId: req.params.id,
            userId: req.user.id
        });

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        logger.error('Failed to delete document', { error });
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

module.exports = router;
