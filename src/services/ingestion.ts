import { documentLoader } from './scraper';
import { textSplitter } from './splitter';
import { getEmbedding } from './embedding';
import { supabase } from './vector-db';

export const ingestUrl = async (url: string) => {
    const text = await documentLoader(url);
    const chunks = textSplitter(text);

    for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk);
        
        const docData = {
            content: chunk,
            vector: embedding,
            metadata: { url: url }
        };
        console.log('DEBUG: Attempting to insert document to Supabase:', JSON.stringify(docData));
        const { data, error } = await supabase.from('documents').insert(docData);
        if (error) {
            console.error('DEBUG: Supabase insert error:', JSON.stringify(error));
        } else {
            console.log('DEBUG: Supabase insert successful');
        }
    }
    return { status: 'success', chunks: chunks.length };
}
