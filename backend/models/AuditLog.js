const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    requestId: String,
    method: String,
    path: String,
    ip: String,
    userId: String,
    userAgent: String,
    action: String, // e.g., 'search', 'upload', 'view', etc.
    metadata: mongoose.Schema.Types.Mixed // Additional details
}, {
    collection: 'audit_logs',
    timestamps: false
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
