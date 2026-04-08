import { documentLoader } from './scraper';
import { textSplitter } from './splitter';
import { getEmbedding } from './embedding';
import { supabase } from './vector-db';

export const ingestUrl = async (url: string) => {
    const text = await documentLoader(url);
    const chunks = textSplitter(text);
    let chunksInserted = 0;
    let chunksFailed = 0;

    for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk);
        
        const docData = {
            content: chunk,
            embedding,
            metadata: { url: url }
        };
        console.log('DEBUG: Attempting to insert document to Supabase:', JSON.stringify(docData));
        const { error } = await supabase.from('documents').insert(docData);
        if (error) {
            chunksFailed += 1;
            console.error('DEBUG: Supabase insert error:', JSON.stringify(error));
        } else {
            chunksInserted += 1;
            console.log('DEBUG: Supabase insert successful');
        }
    }

    return {
        status: chunksFailed > 0 ? 'partial_success' : 'success',
        chunks_inserted: chunksInserted,
        chunks_failed: chunksFailed,
    };
}
