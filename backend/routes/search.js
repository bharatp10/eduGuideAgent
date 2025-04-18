const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const { validateToken, rateLimiter } = require('../middleware/security');
const logger = require('../config/logger');

// Custom rate limiter for search endpoints
const searchRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Search resources
router.get('/', validateToken, searchRateLimiter, async (req, res) => {
    try {
        const {
            q: query,
            page,
            limit,
            sortBy,
            ...filters
        } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Search query is required'
            });
        }

        const results = await searchService.search(
            query,
            filters,
            { page, limit, sortBy }
        );

        res.json(results);
    } catch (error) {
        logger.error('Search request failed', {
            error,
            query: req.query
        });
        res.status(500).json({
            error: 'Failed to perform search'
        });
    }
});

// Get search suggestions
router.get('/suggest', validateToken, searchRateLimiter, async (req, res) => {
    try {
        const { q: query, limit } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Query parameter is required'
            });
        }

        const suggestions = await searchService.suggest(query, limit);
        res.json(suggestions);
    } catch (error) {
        logger.error('Suggestion request failed', {
            error,
            query: req.query
        });
        res.status(500).json({
            error: 'Failed to get suggestions'
        });
    }
});

// Get available filters
router.get('/filters', validateToken, async (req, res) => {
    try {
        const filters = await searchService.getAvailableFilters();
        res.json(filters);
    } catch (error) {
        logger.error('Filter retrieval failed', { error });
        res.status(500).json({
            error: 'Failed to get filters'
        });
    }
});

module.exports = router;
