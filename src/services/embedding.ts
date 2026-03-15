import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Cache for embeddings
const embeddingCache = new Map<string, number[]>();

export const getEmbedding = async (text: string): Promise<number[]> => {
    // Check cache
    if (embeddingCache.has(text)) {
        return embeddingCache.get(text)!;
    }

    const model = genAI.getGenerativeModel({ model: "models/gemini-embedding-2-preview" });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Save to cache
    embeddingCache.set(text, embedding);

    return embedding;
}
