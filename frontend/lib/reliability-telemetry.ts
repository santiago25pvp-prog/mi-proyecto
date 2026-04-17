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

const RELIABILITY_TELEMETRY_PATH = '/telemetry/reliability';

export async function emitDegradedTelemetry(event: {
  requestId: string;
  code: string;
  retryable: boolean;
  retryAfterMs?: number | null;
  toastShown: boolean;
  retryActionAvailable: boolean;
}): Promise<void> {
  const payload: FrontendReliabilityEventV1 = {
    schemaVersion: 'v1',
    eventName: 'frontend_degraded_response_rendered',
    eventTs: new Date().toISOString(),
    requestId: event.requestId,
    route: 'chat-shell',
    reliability: {
      code: event.code,
      degraded: true,
      retryable: event.retryable,
      ...(typeof event.retryAfterMs === 'number' ? { retryAfterMs: event.retryAfterMs } : {}),
    },
    ui: {
      toastShown: event.toastShown,
      retryActionAvailable: event.retryActionAvailable,
    },
  };

  try {
    const body = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(RELIABILITY_TELEMETRY_PATH, blob);
      return;
    }

    if (typeof fetch === 'function') {
      await fetch(RELIABILITY_TELEMETRY_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Fail-open by design: telemetry must never block chat UX.
  }
}
