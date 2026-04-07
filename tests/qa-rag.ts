import 'dotenv/config';
import { GEMINI_EMBEDDING_DIMENSIONS } from '../backend/services/embedding';
import { ingestUrl } from '../backend/services/ingestion';
import { searchDocuments } from '../backend/services/retrieval';
import { ragQuery } from '../backend/controllers/rag';
import { supabase } from '../backend/services/vector-db';

const TEST_URL = 'https://es.wikipedia.org/wiki/Inteligencia_artificial';

async function runQA() {
    console.log('--- Starting RAG QA ---');

    // 1. Ingestion
    console.log('1. Testing Ingestion...');
    const ingestRes = await ingestUrl(TEST_URL);
    console.log('Ingestion result:', ingestRes);

    const { data: docs, error } = await supabase.from('documents').select('*').contains('metadata', { url: TEST_URL });
    if (error) throw error;
    
    if (docs && docs.length > 0) {
        console.log('Ingestion OK. Docs found.');
        console.log(
            'Embedding dimension check:',
            docs[0].embedding.length === GEMINI_EMBEDDING_DIMENSIONS
                ? `PASSED (${GEMINI_EMBEDDING_DIMENSIONS})`
                : `FAILED: Expected ${GEMINI_EMBEDDING_DIMENSIONS}, got ${docs[0].embedding.length}`
        );
    } else {
        throw new Error('No docs found after ingestion');
    }

    // 2. Retrieval
    console.log('2. Testing Retrieval...');
    const query = '¿Qué es la IA?';
    const retrievalRes = await searchDocuments(query);
    console.log('Retrieval found docs:', retrievalRes.length > 0 ? 'PASSED' : 'FAILED');
    
    // 3. Controller Integration
    console.log('3. Testing Controller...');
    const controllerRes = await ragQuery(query);
    console.log('Controller response:', controllerRes);
    console.log('QA Finished.');
}

runQA().catch(console.error);
