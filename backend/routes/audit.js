const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

// POST /api/audit - Store an audit log entry
router.post('/', async (req, res) => {
    try {
        const { requestId, method, path, ip, userId, userAgent, action, metadata } = req.body;
        await AuditLog.create({
            requestId,
            method,
            path,
            ip,
            userId,
            userAgent,
            action,
            metadata
        });
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to store audit log' });
    }
});

module.exports = router;
