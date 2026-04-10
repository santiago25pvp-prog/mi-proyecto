import { supabase } from './vector-db';
import { VectorStore } from './vector-store.interface';
import { getEmbedding } from './embedding';

export class SupabaseVectorAdapter implements VectorStore {
  async searchDocuments(query: string, limit: number): Promise<any> {
    const embedding = await getEmbedding(query);
    
    const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
    });

    if (error) {
        throw error;
    }
    return data;
  }

  async insertDocument(docData: { content: string; embedding: number[]; metadata: Record<string, any> }): Promise<{ error: any }> {
    const { error } = await supabase.from('documents').insert(docData);
    return { error };
  }
}
