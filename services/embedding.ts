import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const GEMINI_EMBEDDING_DIMENSIONS = 3072;

// LRU Cache for embeddings with bounded memory
// max: 10k embeddings, maxSize: 100MB, ttl: 1 hour
const embeddingCache = new LRUCache<string, number[]>({
    max: 10000,
    maxSize: 100 * 1024 * 1024, // 100 MB
    ttl: 1000 * 60 * 60, // 1 hour
    sizeCalculation: (value) => {
        // Each float32 is 4 bytes × embedding dimension
        return value.length * 4;
    },
});

export const getEmbedding = async (text: string): Promise<number[]> => {
    // Check cache
    if (embeddingCache.has(text)) {
        return embeddingCache.get(text)!;
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    if (embedding.length !== GEMINI_EMBEDDING_DIMENSIONS) {
        throw new Error(
            `Unexpected embedding dimensions: expected ${GEMINI_EMBEDDING_DIMENSIONS}, got ${embedding.length}`
        );
    }

    // Save to cache
    embeddingCache.set(text, embedding);

    return embedding;
}
