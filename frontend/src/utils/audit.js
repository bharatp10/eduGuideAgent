// Utility to send audit logs to backend
import axios from 'axios';

export const sendAuditLog = async ({ action, metadata = {} }) => {
    try {
        await axios.post('/api/audit', {
            requestId: localStorage.getItem('requestId') || undefined,
            method: metadata.method || undefined,
            path: window.location.pathname,
            ip: undefined, // Let backend infer if possible
            userId: localStorage.getItem('userId') || 'anonymous',
            userAgent: navigator.userAgent,
            action,
            metadata
        });
    } catch (e) {
        // Optionally handle/report error
        // console.error('Audit log failed', e);
    }
};
