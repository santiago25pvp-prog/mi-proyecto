import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const GEMINI_EMBEDDING_DIMENSIONS = 3072;

// Cache for embeddings
const embeddingCache = new Map<string, number[]>();

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
