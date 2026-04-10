import { VectorStore } from './vector-store.interface';

export const searchDocuments = async (vectorStore: VectorStore, query: string, limit: number = 5) => {
    return vectorStore.searchDocuments(query, limit);
}
