
export interface VectorStore {
    searchDocuments(query: string, limit: number): Promise<any[]>;
    insertDocument(data: any): Promise<{ data: any; error: any }>;
}
