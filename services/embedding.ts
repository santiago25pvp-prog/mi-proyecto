import { GoogleGenerativeAI, GoogleGenerativeAIFetchError, TaskType } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const GEMINI_EMBEDDING_DIMENSIONS = 3072;
const DEFAULT_BATCH_SIZE = 10;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 6000;

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

function isRateLimitError(error: unknown): boolean {
    if (error instanceof GoogleGenerativeAIFetchError) {
        return error.status === 429;
    }

    return typeof error === 'object'
        && error !== null
        && 'status' in error
        && (error as { status?: number }).status === 429;
}

function extractRetryDelayMs(error: unknown): number | null {
    let errorMessage = '';

    if (error instanceof GoogleGenerativeAIFetchError) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message?: string }).message || '';
    }

    // Parse "Please retry in Xs" or similar patterns (including decimals like 29.253932779s)
    const match = errorMessage.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*s/i);
    if (match && match[1]) {
        const seconds = parseFloat(match[1]);
        return seconds * 1000; // Convert to milliseconds
    }

    return null;
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 1;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (!isRateLimitError(error) || attempt >= MAX_RETRY_ATTEMPTS) {
                throw error;
            }

            // Extract retry delay from Gemini's error response, fallback to exponential backoff
            const geminiRetryDelayMs = extractRetryDelayMs(error);
            const delayMs = geminiRetryDelayMs ?? INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

            console.warn(
                `[Embedding] Rate limit (429) on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}. ` +
                `Retrying in ${delayMs}ms${geminiRetryDelayMs ? ' (from Gemini response)' : ' (exponential backoff)'}`
            );

            await wait(delayMs);
            attempt += 1;
        }
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

        const response = await withRateLimitRetry(() =>
            model.batchEmbedContents({
                requests: batchEntries.map(({ text }) => ({
                    content: toContent(text),
                    taskType,
                })),
            })
        );

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
    const result = await withRateLimitRetry(() =>
        model.embedContent({
            content: toContent(text),
            taskType,
        })
    );
    const embedding = result.embedding.values;

    validateEmbedding(embedding);

    cacheEmbedding(text, taskType, embedding);

    return embedding;
}
