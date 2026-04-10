import { documentLoader } from './scraper';
import { textSplitter } from './splitter';
import { getEmbedding } from './embedding';
import { VectorStore } from './vector-store.interface';

export const ingestUrl = async (vectorStore: VectorStore, url: string) => {
    const text = await documentLoader(url);
    const chunks = textSplitter(text);
    let chunksInserted = 0;
    let chunksFailed = 0;

    for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk);
        
        const { error } = await vectorStore.insertDocument({
            content: chunk,
            embedding,
            metadata: { url: url }
        });
        
        if (error) {
            chunksFailed += 1;
        } else {
            chunksInserted += 1;
        }
    }

    return {
        status: chunksFailed > 0 ? 'partial_success' : 'success',
        chunks_inserted: chunksInserted,
        chunks_failed: chunksFailed,
    };
}
