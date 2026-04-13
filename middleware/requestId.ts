import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(_req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

export function getRequestId(res: Response): string {
  const existing = res.locals.requestId;

  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }

  const requestId = crypto.randomUUID();
  res.locals.requestId = requestId;

  if (!res.headersSent) {
    res.setHeader('x-request-id', requestId);
  }
  return requestId;
}
