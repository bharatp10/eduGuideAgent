const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');
const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../config/logger');

class DocumentProcessor {
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

    async processDocument(file) {
        try {
            // Extract text from PDF
            const pdfData = await pdfParse(file.data);
            const text = pdfData.text;

            // Split text into chunks (implement chunking strategy)
            const chunks = this.splitIntoChunks(text);

            // Generate embeddings for each chunk
            const embeddings = await Promise.all(
                chunks.map(chunk => this.generateEmbedding(chunk))
            );

            // Store embeddings in Pinecone
            await this.storeEmbeddings(embeddings, file.name);

            return {
                success: true,
                metadata: {
                    filename: file.name,
                    pageCount: pdfData.numpages,
                    chunkCount: chunks.length
                }
            };
        } catch (error) {
            logger.error('Document processing failed', { error });
            throw error;
        }
    }

    splitIntoChunks(text, maxChunkSize = 1000) {
        // Simple chunking by splitting on paragraphs and maintaining size limits
        const paragraphs = text.split('\n\n');
        const chunks = [];
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length <= maxChunkSize) {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = paragraph;
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        return chunks;
    }

    async generateEmbedding(text) {
        const response = await this.openai.embeddings.create({
            model: process.env.EMBEDDING_MODEL,
            input: text
        });
        return response.data[0].embedding;
    }

    async storeEmbeddings(embeddings, filename) {
        const vectors = embeddings.map((embedding, i) => ({
            id: `${filename}-chunk-${i}`,
            values: embedding,
            metadata: {
                filename,
                chunkIndex: i
            }
        }));

        await this.index.upsert({
            vectors
        });
    }
}

module.exports = new DocumentProcessor();