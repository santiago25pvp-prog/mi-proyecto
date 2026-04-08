import { supabase } from './vector-db';
import { getEmbedding } from './embedding';

export const searchDocuments = async (query: string, limit: number = 5) => {
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
