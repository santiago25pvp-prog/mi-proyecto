import { Request, Response } from 'express';
import logger, { logReliabilityEvent } from '../services/logger';
import { getReliabilityFlags } from '../services/ai';
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
  const flags = getReliabilityFlags();
  const startedAt = Date.now();

  logReliabilityEvent({
    eventName: 'query_request_started',
    requestId,
    route: '/query',
    reliability: {
      degraded: false,
    },
    extra: { queryLength: query.length },
  });

  const result = await executeRagQuery(vectorStore, query, { requestId });
  const latencyMs = Date.now() - startedAt;

  if (result.reliability?.degraded && flags.degradedContractEnabled) {
    logReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId,
      route: '/query',
      level: 'warn',
      reliability: {
        errorClass: 'TRANSIENT_EXHAUSTED',
        code: result.reliability.code,
        degraded: true,
        retryable: true,
        retryAfterMs: result.reliability.retryAfterMs,
        fallbackServed: result.reliability.fallbackServed,
        latencyMs,
      },
    });

    res.status(503).json({
      answer: result.answer,
      sources: result.sources,
      requestId,
      code: result.reliability.code,
      degraded: true,
      retryable: true,
      retryAfterMs: result.reliability.retryAfterMs,
      error: 'Provider temporarily unavailable',
    });
    return;
  }

  logReliabilityEvent({
    eventName: 'query_request_completed',
    requestId,
    route: '/query',
    reliability: {
      degraded: false,
      latencyMs,
    },
    extra: { sourcesCount: result.sources.length },
  });
  res.json({ ...result, requestId });
};
