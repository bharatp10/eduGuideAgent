const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const logger = require('../config/logger');

class RecommendationEngine {
    constructor() {
        this.similarityThreshold = 0.6;
        this.maxRecommendations = 5;
    }

    async getRecommendations(resourceId, options = {}) {
        try {
            const baseResource = await Resource.findById(resourceId)
                .select('+contentVector');

            if (!baseResource) {
                throw new Error('Resource not found');
            }

            const recommendations = await this._findSimilarResources(
                baseResource,
                options
            );

            logger.info('Recommendations generated', {
                resourceId,
                recommendationCount: recommendations.length
            });

            return recommendations;
        } catch (error) {
            logger.error('Failed to generate recommendations', { error });
            throw error;
        }
    }

    async getPersonalizedRecommendations(userId, userPreferences) {
        try {
            // Get user's recent interactions
            const recentInteractions = await this._getUserInteractions(userId);
            
            // Generate preference vector
            const preferenceVector = this._generatePreferenceVector(
                recentInteractions,
                userPreferences
            );

            // Find resources matching preferences
            const recommendations = await this._findMatchingResources(
                preferenceVector,
                userPreferences
            );

            logger.info('Personalized recommendations generated', {
                userId,
                recommendationCount: recommendations.length
            });

            return recommendations;
        } catch (error) {
            logger.error('Failed to generate personalized recommendations', { error });
            throw error;
        }
    }

    async _findSimilarResources(baseResource, options) {
        const query = {
            _id: { $ne: baseResource._id },
            grade: {
                $gte: options.gradeRange?.[0] ?? baseResource.grade - 1,
                $lte: options.gradeRange?.[1] ?? baseResource.grade + 1
            }
        };

        if (options.subjectMatch) {
            query.subject = baseResource.subject;
        }

        if (options.typeMatch) {
            query.type = baseResource.type;
        }

        const resources = await Resource.find(query)
            .select('+contentVector')
            .limit(50);

        // Calculate similarity scores
        const scoredResources = resources.map(resource => ({
            resource,
            similarity: this._calculateCosineSimilarity(
                baseResource.contentVector,
                resource.contentVector
            )
        }));

        // Sort by similarity and filter by threshold
        return scoredResources
            .filter(item => item.similarity >= this.similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, this.maxRecommendations)
            .map(item => ({
                ...item.resource.toObject(),
                similarityScore: item.similarity
            }));
    }

    _calculateCosineSimilarity(vector1, vector2) {
        if (!vector1 || !vector2 || vector1.length !== vector2.length) {
            return 0;
        }

        const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
        const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    async _getUserInteractions(userId, limit = 10) {
        // This would be replaced with actual user interaction history
        // from a UserInteraction model in a real implementation
        return [];
    }

    _generatePreferenceVector(interactions, preferences) {
        // Implement preference vector generation based on user behavior
        // This is a placeholder for more sophisticated user modeling
        const vector = new Array(100).fill(0);
        
        // Factor in subject preferences
        if (preferences.subjects) {
            preferences.subjects.forEach(subject => {
                const index = this._hashString(subject) % vector.length;
                vector[index] = 1;
            });
        }

        // Factor in grade level
        if (preferences.grade) {
            const gradeIndex = preferences.grade % vector.length;
            vector[gradeIndex] = 1;
        }

        // Normalize the vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude === 0 ? vector : vector.map(val => val / magnitude);
    }

    async _findMatchingResources(preferenceVector, preferences) {
        const query = {};

        if (preferences.grade) {
            query.grade = {
                $gte: preferences.grade - 1,
                $lte: preferences.grade + 1
            };
        }

        if (preferences.subjects?.length > 0) {
            query.subject = { $in: preferences.subjects };
        }

        const resources = await Resource.find(query)
            .select('+contentVector')
            .limit(50);

        // Calculate preference matches
        const matchedResources = resources.map(resource => ({
            resource,
            score: this._calculatePreferenceMatch(
                preferenceVector,
                resource.contentVector,
                preferences
            )
        }));

        // Sort by score and return top recommendations
        return matchedResources
            .sort((a, b) => b.score - a.score)
            .slice(0, this.maxRecommendations)
            .map(item => ({
                ...item.resource.toObject(),
                matchScore: item.score
            }));
    }

    _calculatePreferenceMatch(preferenceVector, resourceVector, preferences) {
        // Base similarity score
        let score = this._calculateCosineSimilarity(preferenceVector, resourceVector);

        // Boost score based on exact subject match
        if (preferences.subjects?.includes(resourceVector.subject)) {
            score *= 1.2;
        }

        // Boost score based on grade level proximity
        if (preferences.grade) {
            const gradeDiff = Math.abs(preferences.grade - resourceVector.grade);
            score *= (1 - gradeDiff * 0.1);
        }

        return Math.min(1, Math.max(0, score));
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}

module.exports = new RecommendationEngine();