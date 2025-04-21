const mongoose = require('mongoose');
const crypto = require('crypto');

const ResourceSchema = new mongoose.Schema({
    // Basic Information
    type: {
        type: String,
        required: true,
        enum: ['textbook', 'question_paper'],
        index: true
    },
    subject: {
        type: String,
        required: true,
        index: true
    },
    grade: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                return v >= 1900 && v <= new Date().getFullYear() + 1;
            }
        }
    },

    // Storage & Security
    fileHash: {
        type: String,
        required: true,
        index: true
    },
    storageUrl: {
        type: String,
        required: true
    },
    storageKey: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },
    publiclyAccessible: {
        type: Boolean,
        default: false
    },

    // Search & Retrieval
    contentVector: {
        type: [Number],
        required: true,
        select: false // Only load when explicitly requested
    },
    keywords: [{
        type: String
    }],
    
    // Metadata
    fileSize: Number,
    pageCount: Number,
    mimeType: {
        type: String,
        required: true,
        enum: ['application/pdf']
    },
    language: {
        type: String,
        default: 'en'
    },
    
    // Analytics & Tracking
    accessCount: {
        type: Number,
        default: 0
    },
    lastAccessed: Date,
    
    // Versioning
    version: {
        type: Number,
        default: 1
    },
    previousVersions: [{
        storageKey: String,
        fileHash: String,
        version: Number,
        updatedAt: Date
    }]
}, {
    timestamps: true,
    collection: 'resources'
});

// Indexes for efficient querying
ResourceSchema.index({ subject: 1, grade: 1, type: 1 });
ResourceSchema.index({ keywords: 1 });
ResourceSchema.index({ contentVector: '2dsphere' });

// Pre-save middleware to ensure security
ResourceSchema.pre('save', function(next) {
    if (this.isNew) {
        // Generate a unique access token if not present
        if (!this.accessToken) {
            this.accessToken = crypto.randomBytes(32).toString('hex');
        }
    }
    next();
});

// Methods for secure access
ResourceSchema.methods.verifyAccess = function(token) {
    return this.accessToken === token || this.publiclyAccessible;
};

ResourceSchema.methods.incrementAccessCount = async function() {
    this.accessCount += 1;
    this.lastAccessed = new Date();
    await this.save();
};

// Static method for secure retrieval
ResourceSchema.statics.findByIdAndVerify = async function(id, token) {
    const resource = await this.findById(id);
    if (!resource) return null;
    if (!resource.verifyAccess(token)) return null;
    await resource.incrementAccessCount();
    return resource;
};

const Resource = mongoose.model('Resource', ResourceSchema);

module.exports = Resource;