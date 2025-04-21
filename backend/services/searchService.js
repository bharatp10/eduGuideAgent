const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../config/logger');

class SearchService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_INDEX) {
            throw new Error('Missing Pinecone environment variables. Please set PINECONE_API_KEY, PINECONE_ENVIRONMENT, and PINECONE_INDEX in your .env file.');
        }
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        this.index = this.pinecone.index({
            name: process.env.PINECONE_INDEX,
            environment: process.env.PINECONE_ENVIRONMENT
        });
    }

    async semanticSearch(query, limit = 5) {
        try {
            // Generate embedding for the search query
            const queryEmbedding = await this.generateQueryEmbedding(query);

            // Search Pinecone index
            const searchResults = await this.index.query({
                vector: queryEmbedding,
                topK: limit,
                includeMetadata: true
            });

            // Format and return results
            return searchResults.matches.map(match => ({
                score: match.score,
                filename: match.metadata.filename,
                chunkIndex: match.metadata.chunkIndex
            }));
        } catch (error) {
            logger.error('Semantic search failed', { error, query });
            throw error;
        }
    }

    async generateQueryEmbedding(query) {
        const response = await this.openai.embeddings.create({
            model: process.env.EMBEDDING_MODEL,
            input: query
        });
        return response.data[0].embedding;
    }
}

module.exports = new SearchService();