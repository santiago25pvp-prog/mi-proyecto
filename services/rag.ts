import { searchDocuments } from './retrieval';
import { generateAnswer } from './ai';
import { VectorStore } from './vector-store.interface';

interface RagQueryResponse {
    answer: string;
    sources: Array<{
        name: string;
        content: string;
    }>;
}

function getDocumentContent(result: any): string {
    return result?.document?.content ?? result?.content ?? result?.text ?? '';
}

function getDocumentName(result: any): string {
    return result?.document?.name ?? result?.name ?? result?.title ?? 'Documento';
}

export const executeRagQuery = async (vectorStore: VectorStore, query: string): Promise<RagQueryResponse> => {
    // 1. Search documents in vector DB
    const searchResults = await searchDocuments(vectorStore, query, 5);
    
    if (!searchResults || searchResults.length === 0) {
        return {
            answer: "No encontré documentos relevantes para responder tu pregunta.",
            sources: []
        };
    }

    // 2. Build context from documents
    const context = searchResults
        .map(result => getDocumentContent(result))
        .filter(Boolean)
        .join('\n\n');

    // 3. Generate answer with AI
    const answer = await generateAnswer(context, query);

    // 4. Format sources
    const sources = searchResults.map(result => ({
        name: getDocumentName(result),
        content: getDocumentContent(result)
    }));

    return { answer, sources };
}
