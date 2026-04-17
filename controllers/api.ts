import { Request, Response } from 'express';
import logger from '../services/logger';
import { ingestUrl } from '../services/ingestion';
import { executeRagQuery } from '../services/rag';
import { SupabaseVectorAdapter } from '../services/supabase-vector-adapter';
import { getValidatedRequest } from '../middleware/requestValidation';
import { HttpError } from '../middleware/httpError';
import { getRequestId } from '../middleware/requestId';

const vectorStore = new SupabaseVectorAdapter();

export const ingestHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const { body } = getValidatedRequest(res);
  const url = body.url as string;

  logger.info('ingest_request_started', { requestId, url });

  try {
    const result = await ingestUrl(vectorStore, url);
    logger.info('ingest_request_completed', { requestId, result });
    res.json({ ...result, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('ingest_request_failed', { requestId, error: message });

    if (message.includes('timeout')) {
      throw new HttpError('Request timeout: URL took too long to respond', 408);
    }

    if (message.includes('404')) {
      throw new HttpError('URL not found', 400);
    }

    if (message.includes('HTTP')) {
      throw new HttpError('Failed to fetch URL', 502);
    }

    throw new HttpError('Failed to ingest URL', 500);
  }
};

export const queryHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const { body } = getValidatedRequest(res);
  const query = body.query as string;

  logger.info('query_request_started', { requestId, queryLength: query.length });

  const result = await executeRagQuery(vectorStore, query);
  logger.info('query_request_completed', { requestId, sourcesCount: result.sources.length });
  res.json({ ...result, requestId });
};
