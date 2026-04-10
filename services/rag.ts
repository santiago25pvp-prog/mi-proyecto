import { searchDocuments } from './retrieval';
import { generateAnswer } from './ai';

export const executeRagQuery = async (query: string) => {
    // 1. Search documents in vector DB
    const documents = await searchDocuments(query, 5);
    
    if (!documents || documents.length === 0) {
        return {
            answer: "No encontré documentos relevantes para responder tu pregunta.",
            sources: []
        };
    }

    // 2. Build context from documents
    const context = documents
        .map((doc: any) => doc.content || doc.text || '')
        .join('\n\n');

    // 3. Generate answer with AI
    const answer = await generateAnswer(context, query);

    // 4. Format sources
    const sources = documents.map((doc: any) => ({
        name: doc.name || doc.title || 'Documento',
        content: doc.content || doc.text || ''
    }));

    return { answer, sources };
}
