import { Request, Response } from 'express';
import logger from '../logger';
import { createReliabilityEvent, validateReliabilityEvent } from './event-schema';

export interface FrontendReliabilityEventV1 {
  schemaVersion: 'v1';
  eventName: 'frontend_degraded_response_rendered';
  eventTs: string;
  requestId: string;
  route: 'chat-shell';
  reliability: {
    code: string;
    degraded: true;
    retryable: boolean;
    retryAfterMs?: number;
  };
  ui: {
    toastShown: boolean;
    retryActionAvailable: boolean;
  };
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function normalizePayload(value: unknown): FrontendReliabilityEventV1 | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const reliability = payload.reliability as Record<string, unknown> | undefined;
  const ui = payload.ui as Record<string, unknown> | undefined;

  if (!reliability || !ui) {
    return null;
  }

  if (
    payload.eventName !== 'frontend_degraded_response_rendered'
    || payload.route !== 'chat-shell'
    || typeof payload.requestId !== 'string'
    || typeof reliability.code !== 'string'
    || reliability.degraded !== true
  ) {
    return null;
  }

  const retryAfterMs = typeof reliability.retryAfterMs === 'number' ? reliability.retryAfterMs : undefined;

  return {
    schemaVersion: 'v1',
    eventName: 'frontend_degraded_response_rendered',
    eventTs: typeof payload.eventTs === 'string' ? payload.eventTs : new Date().toISOString(),
    requestId: payload.requestId,
    route: 'chat-shell',
    reliability: {
      code: reliability.code,
      degraded: true,
      retryable: toBoolean(reliability.retryable),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    },
    ui: {
      toastShown: toBoolean(ui.toastShown),
      retryActionAvailable: toBoolean(ui.retryActionAvailable),
    },
  };
}

export function telemetryReliabilityHandler(req: Request, res: Response): void {
  const payload = normalizePayload(req.body);

  if (!payload) {
    res.status(400).json({ ok: false, error: 'Invalid reliability telemetry payload' });
    return;
  }

  const event = createReliabilityEvent({
    eventName: payload.eventName,
    requestId: payload.requestId,
    route: payload.route,
    reliability: {
      code: payload.reliability.code,
      degraded: payload.reliability.degraded,
      retryable: payload.reliability.retryable,
      retryAfterMs: payload.reliability.retryAfterMs,
    },
  });
  const validation = validateReliabilityEvent(event);

  if (!validation.valid) {
    logger.warn('frontend_reliability_event_invalid', {
      requestId: payload.requestId,
      errors: validation.errors,
    });
    res.status(400).json({ ok: false, error: 'Invalid reliability event contract' });
    return;
  }

  logger.info('frontend_degraded_telemetry_ingested', {
    ...event,
    ui: payload.ui,
  });

  res.status(202).json({ ok: true });
}
