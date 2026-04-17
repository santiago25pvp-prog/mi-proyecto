import { NextFunction, Request, Response } from 'express';
import { getReliabilityFlags } from '../services/ai';
import logger, { logReliabilityEvent } from '../services/logger';
import { DEGRADED_CODE, isRagReliabilityError } from '../services/rag-reliability';
import { isHttpError } from './httpError';
import { getRequestId } from './requestId';

export function notFoundHandler(req: Request, res: Response) {
  const requestId = getRequestId(res);
  res.status(404).json({ error: 'Not Found', requestId });
}

export function errorMiddleware(error: unknown, req: Request, res: Response, next: NextFunction) {
  const requestId = getRequestId(res);
  const flags = getReliabilityFlags();

  if (res.headersSent) {
    return next(error);
  }

  if (isHttpError(error)) {
    return res.status(error.statusCode).json({
      error: error.message,
      requestId,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (isRagReliabilityError(error)) {
    if (error.errorClass === 'TRANSIENT_EXHAUSTED') {
      if (!flags.degradedContractEnabled) {
        return res.status(500).json({ error: 'Internal Server Error', requestId });
      }

      logger.warn('rag_query_degraded_response', {
        requestId,
        code: DEGRADED_CODE,
        retryAfterMs: error.retryAfterMs ?? 300,
        fallbackServed: false,
      });

      logReliabilityEvent({
        eventName: 'query_request_degraded',
        requestId,
        route: '/query',
        level: 'warn',
        reliability: {
          errorClass: 'TRANSIENT_EXHAUSTED',
          code: DEGRADED_CODE,
          degraded: true,
          retryable: true,
          retryAfterMs: error.retryAfterMs ?? 300,
          fallbackServed: false,
          status: 503,
        },
      });

      return res.status(503).json({
        error: error.message,
        requestId,
        code: DEGRADED_CODE,
        degraded: true,
        retryable: true,
        retryAfterMs: error.retryAfterMs ?? 300,
      });
    }

    if (error.errorClass === 'TERMINAL_PROVIDER') {
      return res.status(error.status ?? 502).json({
        error: error.message,
        requestId,
        degraded: false,
        retryable: false,
      });
    }

    if (error.errorClass === 'TERMINAL_REQUEST') {
      return res.status(error.status ?? 400).json({
        error: error.message,
        requestId,
        degraded: false,
        retryable: false,
      });
    }
  }

  logger.error('unhandled_request_error', {
    requestId,
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : String(error),
  });

  logReliabilityEvent({
    eventName: 'unhandled_request_error',
    requestId,
    route: 'internal',
    level: 'error',
    reliability: {
      errorClass: 'INTERNAL_UNKNOWN',
      degraded: false,
      retryable: false,
      status: 500,
    },
    extra: {
      path: req.path,
      method: req.method,
    },
  });

  return res.status(500).json({ error: 'Internal Server Error', requestId });
}
