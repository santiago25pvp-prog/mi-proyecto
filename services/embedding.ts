import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const GEMINI_EMBEDDING_DIMENSIONS = 3072;
const DEFAULT_BATCH_SIZE = 10;

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

function getCacheKey(text: string, taskType: TaskType): string {
    return `${taskType}::${text}`;
}

function cacheEmbedding(text: string, taskType: TaskType, embedding: number[]) {
    embeddingCache.set(getCacheKey(text, taskType), embedding);
}

function getCachedEmbedding(text: string, taskType: TaskType): number[] | undefined {
    return embeddingCache.get(getCacheKey(text, taskType));
}

function toContent(text: string) {
    return {
        role: 'user',
        parts: [{ text }],
    };
}

function validateEmbedding(embedding: number[]) {
    if (embedding.length !== GEMINI_EMBEDDING_DIMENSIONS) {
        throw new Error(
            `Unexpected embedding dimensions: expected ${GEMINI_EMBEDDING_DIMENSIONS}, got ${embedding.length}`
        );
    }
}

export const getEmbeddings = async (
    texts: string[],
    taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT,
    batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<number[][]> => {
    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const results = new Array<number[]>(texts.length);

    for (let index = 0; index < texts.length; index += 1) {
        const cached = getCachedEmbedding(texts[index], taskType);
        if (cached) {
            results[index] = cached;
        }
    }

    for (let start = 0; start < texts.length; start += batchSize) {
        const batchEntries = texts
            .slice(start, start + batchSize)
            .map((text, offset) => ({ text, index: start + offset }))
            .filter(({ text }) => !getCachedEmbedding(text, taskType));

        if (batchEntries.length === 0) {
            continue;
        }

        const response = await model.batchEmbedContents({
            requests: batchEntries.map(({ text }) => ({
                content: toContent(text),
                taskType,
            })),
        });

        response.embeddings.forEach((embedding, responseIndex) => {
            const requestIndex = batchEntries[responseIndex].index;
            validateEmbedding(embedding.values);
            results[requestIndex] = embedding.values;
            cacheEmbedding(texts[requestIndex], taskType, embedding.values);
        });
    }

    return results.map((embedding, index) => {
        if (!embedding) {
            throw new Error(`Missing embedding result for text at index ${index}`);
        }

        return embedding;
    });
};

export const getEmbedding = async (
    text: string,
    taskType: TaskType = TaskType.RETRIEVAL_QUERY,
): Promise<number[]> => {
    const cached = getCachedEmbedding(text, taskType);

    if (cached) {
        return cached;
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent({
        content: toContent(text),
        taskType,
    });
    const embedding = result.embedding.values;

    validateEmbedding(embedding);

    cacheEmbedding(text, taskType, embedding);

    return embedding;
}
