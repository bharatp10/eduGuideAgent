const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');
const logger = require('../config/logger');

class SearchService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.pinecone = new PineconeClient();
        this.initialize();
    }

    async initialize() {
        await this.pinecone.init({
            environment: process.env.PINECONE_ENVIRONMENT,
            apiKey: process.env.PINECONE_API_KEY
        });
        this.index = this.pinecone.Index(process.env.PINECONE_INDEX);
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