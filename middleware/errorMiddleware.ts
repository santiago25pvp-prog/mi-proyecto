import { NextFunction, Request, Response } from 'express';
import logger from '../services/logger';
import { isHttpError } from './httpError';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorMiddleware(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(error);
  }

  if (isHttpError(error)) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : String(error),
  });

  return res.status(500).json({ error: 'Internal Server Error' });
}
