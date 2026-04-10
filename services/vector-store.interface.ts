export interface VectorStore {
  searchDocuments(query: string, limit: number): Promise<any>;
  insertDocument(docData: { content: string; embedding: number[]; metadata: Record<string, any> }): Promise<{ error: any }>;
}
