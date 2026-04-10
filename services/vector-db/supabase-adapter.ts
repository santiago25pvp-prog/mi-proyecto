
import { supabase } from '../vector-db';
import { VectorStore } from './interface';
import { getEmbedding } from '../embedding';

export class SupabaseVectorAdapter implements VectorStore {
    async searchDocuments(query: string, limit: number = 5): Promise<any[]> {
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

    async insertDocument(data: any): Promise<{ data: any; error: any }> {
        const { data: insertedData, error } = await supabase.from('documents').insert(data);
        return { data: insertedData, error };
    }
}
