import { searchDocuments } from './retrieval';
import { generateAnswerWithReliability, getReliabilityFlags } from './ai';
import logger from './logger';
import {
  DEGRADED_CODE,
  isRagReliabilityError,
} from './rag-reliability';
import { VectorStore } from './vector-store.interface';

interface RagQueryResponse {
    answer: string;
    sources: Array<{
        name: string;
        content: string;
    }>;
    reliability?: {
        code: typeof DEGRADED_CODE;
        degraded: true;
        retryable: true;
        retryAfterMs: number;
        fallbackServed: boolean;
    };
}

interface ExecuteRagQueryOptions {
    requestId?: string;
}

const DEFAULT_TRANSIENT_FALLBACK_MESSAGE =
    'El proveedor de IA está temporalmente inestable. Mostramos una respuesta degradada y te sugerimos reintentar en breve.';

function getDocumentContent(result: any): string {
    return result?.document?.content ?? result?.content ?? result?.text ?? '';
}

function getDocumentName(result: any): string {
    return result?.document?.name ?? result?.name ?? result?.title ?? 'Documento';
}

export const executeRagQuery = async (
    vectorStore: VectorStore,
    query: string,
    options: ExecuteRagQueryOptions = {},
): Promise<RagQueryResponse> => {
    const requestId = options.requestId;
    const flags = getReliabilityFlags();

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
    let answer = '';
    let reliability: RagQueryResponse['reliability'];

    try {
        const generated = await generateAnswerWithReliability(context, query, { requestId, flags });
        answer = generated.answer;
    } catch (error) {
        if (
            isRagReliabilityError(error)
            && error.errorClass === 'TRANSIENT_EXHAUSTED'
            && flags.fallbackOnTransientEnabled
        ) {
            const retryAfterMs = error.retryAfterMs ?? 300;

            logger.warn('rag_query_fallback_served', {
                requestId,
                reason: 'transient_provider_exhausted',
                policyFlag: 'RAG_FALLBACK_ON_TRANSIENT_ENABLED',
                retryAfterMs,
            });

            answer = DEFAULT_TRANSIENT_FALLBACK_MESSAGE;
            reliability = {
                code: DEGRADED_CODE,
                degraded: true,
                retryable: true,
                retryAfterMs,
                fallbackServed: true,
            };
        } else {
            throw error;
        }
    }

    // 4. Format sources
    const sources = searchResults.map(result => ({
        name: getDocumentName(result),
        content: getDocumentContent(result)
    }));

    if (reliability) {
        logger.warn('rag_query_degraded_response', {
            requestId,
            code: reliability.code,
            retryAfterMs: reliability.retryAfterMs,
            fallbackServed: reliability.fallbackServed,
        });
    }

    return {
        answer,
        sources: reliability ? [] : sources,
        ...(reliability ? { reliability } : {}),
    };
}
