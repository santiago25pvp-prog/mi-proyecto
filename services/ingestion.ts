import { documentLoader } from './scraper';
import { textSplitter } from './splitter';
import { getEmbeddings } from './embedding';
import { VectorStore } from './vector-store.interface';
import { TaskType } from '@google/generative-ai';

export const ingestUrl = async (vectorStore: VectorStore, url: string) => {
    const text = await documentLoader(url);
    const chunks = textSplitter(text);
    let chunksInserted = 0;
    let chunksFailed = 0;

    if (chunks.length === 0) {
        return {
            status: 'success',
            chunks_inserted: 0,
            chunks_failed: 0,
        };
    }

    const embeddings = await getEmbeddings(chunks, TaskType.RETRIEVAL_DOCUMENT);
    const batchSize = 10;

    for (let start = 0; start < chunks.length; start += batchSize) {
        const insertionResults = await Promise.allSettled(
            chunks.slice(start, start + batchSize).map((chunk, offset) =>
                vectorStore.insertDocument({
                    content: chunk,
                    embedding: embeddings[start + offset],
                    metadata: { url: url }
                })
            )
        );

        for (const result of insertionResults) {
            if (result.status === 'fulfilled' && !result.value.error) {
                chunksInserted += 1;
            } else {
                chunksFailed += 1;
            }
        }
    }

    return {
        status: chunksFailed > 0 ? 'partial_success' : 'success',
        chunks_inserted: chunksInserted,
        chunks_failed: chunksFailed,
    };
}
