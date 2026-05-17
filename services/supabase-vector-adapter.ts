import { supabase } from './vector-db';
import { VectorStore, SearchResult, InsertResult, Document } from './vector-store.interface';
import { getEmbedding } from './embedding';
import { TaskType } from '@google/generative-ai';
import logger, { logReliabilityEvent } from './logger';
import { getRetrievalConfig, RetrievalConfig } from './retrieval-config';
import { rerankSearchResults } from './retrieval-rerank';

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
  private mapSearchResults(data: SupabaseMatchDocumentRow[] | null): SearchResult[] {
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

  private async searchVector(embedding: number[], limit: number): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) {
      throw error;
    }

    return this.mapSearchResults(data as SupabaseMatchDocumentRow[] | null);
  }

  private async searchHybrid(query: string, embedding: number[], limit: number, config: RetrievalConfig): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('match_documents_hybrid', {
      query_text: query,
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit,
      vector_weight: config.vectorWeight,
      fts_weight: config.ftsWeight,
    });

    if (error) {
      throw error;
    }

    return this.mapSearchResults(data as SupabaseMatchDocumentRow[] | null);
  }

  private applyRerank(query: string, results: SearchResult[], config: RetrievalConfig): SearchResult[] {
    if (!config.rerank.enabled) {
      return results;
    }

    return rerankSearchResults(query, results, config.rerank);
  }

  async searchDocuments(query: string, limit: number): Promise<SearchResult[]> {
    const embedding = await getEmbedding(query, TaskType.RETRIEVAL_QUERY);
    const config = getRetrievalConfig();

    logReliabilityEvent({
      eventName: 'retrieval_mode_selected',
      requestId: 'unknown',
      route: 'internal',
      reliability: {
        degraded: false,
      },
      extra: {
        mode: config.mode,
        vectorWeight: config.vectorWeight,
        ftsWeight: config.ftsWeight,
      },
    });

    if (config.mode === 'hybrid') {
      try {
        const results = await this.searchHybrid(query, embedding, limit, config);
        return this.applyRerank(query, results, config);
      } catch (error) {
        logger.warn('retrieval_hybrid_fallback_vector', {
          reason: error instanceof Error ? error.message : String(error),
        });
        logReliabilityEvent({
          eventName: 'retrieval_hybrid_fallback_vector',
          requestId: 'unknown',
          route: 'internal',
          level: 'warn',
          reliability: {
            degraded: true,
            fallbackServed: true,
          },
          extra: {
            reason: error instanceof Error ? error.message : String(error),
          },
        });
        const results = await this.searchVector(embedding, limit);
        return this.applyRerank(query, results, config);
      }
    }

    const results = await this.searchVector(embedding, limit);
    return this.applyRerank(query, results, config);
  }

  async insertDocument(docData: { content: string; embedding: number[]; metadata: Record<string, unknown> }): Promise<InsertResult> {
    const { error } = await supabase.from('documents').insert(docData);
    return { 
      error: error || null,
      success: !error
    };
  }
}
