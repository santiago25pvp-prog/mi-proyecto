export interface Document {
  id: number;
  name: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SearchResult {
  similarity: number;
  document: Document;
}

export interface InsertResult {
  error?: Error | null;
  success: boolean;
}

export interface VectorStore {
  searchDocuments(query: string, limit: number): Promise<SearchResult[]>;
  insertDocument(docData: { content: string; embedding: number[]; metadata: Record<string, unknown> }): Promise<InsertResult>;
}
