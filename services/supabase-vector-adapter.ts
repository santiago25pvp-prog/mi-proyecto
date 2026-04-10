import { supabase } from './vector-db';
import { VectorStore, SearchResult, InsertResult, Document } from './vector-store.interface';
import { getEmbedding } from './embedding';
import { TaskType } from '@google/generative-ai';

interface SupabaseMatchDocumentRow {
  id: number;
  name: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
  similarity: number;
}

export class SupabaseVectorAdapter implements VectorStore {
  async searchDocuments(query: string, limit: number): Promise<SearchResult[]> {
    const embedding = await getEmbedding(query, TaskType.RETRIEVAL_QUERY);
    
    const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
    });

    if (error) {
        throw error;
    }

    // Transform Supabase response to SearchResult[]
    return (data || []).map((item: SupabaseMatchDocumentRow) => ({
      similarity: item.similarity,
      document: {
        id: item.id,
        name: item.name,
        content: item.content,
        embedding: item.embedding,
        metadata: item.metadata,
        created_at: item.created_at
      } as Document
    }));
  }

  async insertDocument(docData: { content: string; embedding: number[]; metadata: Record<string, unknown> }): Promise<InsertResult> {
    const { error } = await supabase.from('documents').insert(docData);
    return { 
      error: error || null,
      success: !error
    };
  }
}
