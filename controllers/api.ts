import { Request, Response } from 'express';
import logger, { logReliabilityEvent } from '../services/logger';
import { getReliabilityFlags } from '../services/ai';
import { ingestUrl } from '../services/ingestion';
import { createIngestJobQueue, IngestJob, IngestResult } from '../services/ingest-jobs';
import { executeRagQuery } from '../services/rag';
import { SupabaseVectorAdapter } from '../services/supabase-vector-adapter';
import { getValidatedRequest } from '../middleware/requestValidation';
import { HttpError } from '../middleware/httpError';
import { getRequestId } from '../middleware/requestId';
import { DEGRADED_CODE, isRagReliabilityError } from '../services/rag-reliability';

const vectorStore = new SupabaseVectorAdapter();
const STREAM_HEARTBEAT_MS = 15000;
const STREAM_CHUNK_SIZE = 72;

export const ingestJobQueue = createIngestJobQueue({
  runIngest: (url: string): Promise<IngestResult> => ingestUrl(vectorStore, url),
});

type SseEventName = 'token' | 'done' | 'error';

function writeSseEvent(res: Response, event: SseEventName, payload: Record<string, unknown>): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function chunkAnswer(text: string, chunkSize = STREAM_CHUNK_SIZE): string[] {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

function serializeIngestJob(job: IngestJob) {
  return {
    jobId: job.id,
    status: job.status,
    url: job.url,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    ...(job.startedAt ? { startedAt: job.startedAt } : {}),
    ...(job.completedAt ? { completedAt: job.completedAt } : {}),
    ...(job.result ? { result: job.result } : {}),
    ...(job.error ? { error: job.error } : {}),
  };
}

export const ingestHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const { body } = getValidatedRequest(res);
  const url = body.url as string;

  const { job, reused } = ingestJobQueue.queueJob(url, requestId);

  logger.info('ingest_request_accepted', {
    requestId,
    jobId: job.id,
    url: job.url,
    status: job.status,
    reused,
  });

  res.status(202).json({
    jobId: job.id,
    status: job.status,
    requestId,
  });
};

export const ingestStatusHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = ingestJobQueue.getJob(jobId ?? '');

  if (!job) {
    throw new HttpError('Ingest job not found', 404);
  }

  res.json({
    ...serializeIngestJob(job),
    requestId,
  });
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

export const queryStreamHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const { body } = getValidatedRequest(res);
  const query = body.query as string;
  const startedAt = Date.now();
  let firstTokenAt: number | null = null;
  let streamClosed = false;

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const heartbeat = setInterval(() => {
    if (streamClosed) {
      return;
    }

    res.write(': heartbeat\n\n');
  }, STREAM_HEARTBEAT_MS);

  const closeStream = () => {
    if (streamClosed) {
      return;
    }

    streamClosed = true;
    clearInterval(heartbeat);
    if (!res.writableEnded) {
      res.end();
    }
  };

  req.on('close', () => {
    if (streamClosed) {
      return;
    }

    logReliabilityEvent({
      eventName: 'stream_abort',
      requestId,
      route: '/query/stream',
      level: 'warn',
      reliability: {
        degraded: false,
      },
      extra: {
        latencyMs: Date.now() - startedAt,
      },
    });

    closeStream();
  });

  logReliabilityEvent({
    eventName: 'stream_start',
    requestId,
    route: '/query/stream',
    reliability: {
      degraded: false,
    },
    extra: {
      queryLength: query.length,
    },
  });

  try {
    const result = await executeRagQuery(vectorStore, query, { requestId });
    const chunks = chunkAnswer(result.answer);
    let accumulated = '';

    for (const chunk of chunks) {
      if (streamClosed) {
        return;
      }

      accumulated += chunk;

      writeSseEvent(res, 'token', {
        requestId,
        delta: chunk,
      });

      if (!firstTokenAt) {
        firstTokenAt = Date.now();
        logReliabilityEvent({
          eventName: 'first_token',
          requestId,
          route: '/query/stream',
          reliability: {
            degraded: false,
          },
          extra: {
            firstTokenMs: firstTokenAt - startedAt,
          },
        });
      }
    }

    writeSseEvent(res, 'done', {
      requestId,
      answer: accumulated,
      sources: result.sources,
      degraded: result.reliability?.degraded ?? false,
      retryable: result.reliability?.retryable ?? false,
      retryAfterMs: result.reliability?.retryAfterMs,
      code: result.reliability?.code,
      timings: {
        firstTokenMs: firstTokenAt ? firstTokenAt - startedAt : null,
        totalMs: Date.now() - startedAt,
      },
    });

    logReliabilityEvent({
      eventName: 'stream_done',
      requestId,
      route: '/query/stream',
      reliability: {
        degraded: result.reliability?.degraded ?? false,
        code: result.reliability?.code,
        retryable: result.reliability?.retryable ?? false,
        retryAfterMs: result.reliability?.retryAfterMs,
      },
      extra: {
        totalMs: Date.now() - startedAt,
        sourcesCount: result.sources.length,
      },
    });
  } catch (error) {
    const basePayload = {
      requestId,
      error: error instanceof Error ? error.message : 'Internal Server Error',
      degraded: false,
      retryable: false,
      status: 500,
      code: undefined as string | undefined,
      retryAfterMs: undefined as number | undefined,
    };

    const payload = isRagReliabilityError(error)
      ? {
          ...basePayload,
          status: error.status ?? (error.errorClass === 'TRANSIENT_EXHAUSTED' ? 503 : 502),
          degraded: error.errorClass === 'TRANSIENT_EXHAUSTED',
          retryable: error.retryable,
          code: error.errorClass === 'TRANSIENT_EXHAUSTED' ? DEGRADED_CODE : undefined,
          retryAfterMs: error.retryAfterMs,
        }
      : basePayload;

    if (!streamClosed) {
      writeSseEvent(res, 'error', payload);
    }

    logger.error('query_stream_failed', {
      requestId,
      error: payload.error,
      status: payload.status,
      retryable: payload.retryable,
      degraded: payload.degraded,
    });

    logReliabilityEvent({
      eventName: 'stream_error',
      requestId,
      route: '/query/stream',
      level: 'warn',
      reliability: {
        degraded: payload.degraded,
        retryable: payload.retryable,
        retryAfterMs: payload.retryAfterMs,
        code: payload.code,
        status: payload.status,
      },
      extra: {
        latencyMs: Date.now() - startedAt,
      },
    });
  } finally {
    closeStream();
  }
};
