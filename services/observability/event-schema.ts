export const RELIABILITY_SCHEMA_VERSION = 'v1' as const;

export type ReliabilitySeverity = 'warning' | 'critical' | 'none';

export type ReliabilityErrorClass =
  | 'TRANSIENT_PROVIDER'
  | 'TRANSIENT_EXHAUSTED'
  | 'TERMINAL_PROVIDER'
  | 'TERMINAL_REQUEST'
  | 'INTERNAL_UNKNOWN';

export type ReliabilityEventName =
  | 'query_request_started'
  | 'query_request_completed'
  | 'query_request_degraded'
  | 'rag_provider_retry'
  | 'rag_provider_retry_exhausted'
  | 'rag_query_degraded_response'
  | 'rag_query_fallback_served'
  | 'rag_query_terminal_error'
  | 'unhandled_request_error'
  | 'frontend_degraded_response_rendered'
  | 'frontend_degraded_telemetry_ingested';

export type ReliabilityRoute = '/query' | '/ingest' | 'internal' | 'chat-shell';

export interface ReliabilityEventV1 {
  schemaVersion: typeof RELIABILITY_SCHEMA_VERSION;
  eventName: ReliabilityEventName;
  eventTs: string;
  requestId: string;
  route: ReliabilityRoute;
  release: string;
  reliability: {
    errorClass?: ReliabilityErrorClass;
    code?: string;
    degraded?: boolean;
    retryable?: boolean;
    retryAfterMs?: number;
    attemptsUsed?: number;
    fallbackServed?: boolean;
    status?: number;
    latencyMs?: number;
    severity?: ReliabilitySeverity;
  };
}

export interface ReliabilityValidationResult {
  valid: boolean;
  errors: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const RELIABILITY_EVENT_NAMES = new Set<ReliabilityEventName>([
  'query_request_started',
  'query_request_completed',
  'query_request_degraded',
  'rag_provider_retry',
  'rag_provider_retry_exhausted',
  'rag_query_degraded_response',
  'rag_query_fallback_served',
  'rag_query_terminal_error',
  'unhandled_request_error',
  'frontend_degraded_response_rendered',
  'frontend_degraded_telemetry_ingested',
]);

const RELIABILITY_ROUTES = new Set<ReliabilityRoute>([
  '/query',
  '/ingest',
  'internal',
  'chat-shell',
]);

const RELIABILITY_SEVERITIES = new Set<ReliabilitySeverity>(['warning', 'critical', 'none']);

export function resolveRelease(env: NodeJS.ProcessEnv = process.env): string {
  const release = env.APP_RELEASE ?? env.RELEASE_SHA ?? env.npm_package_version;
  return isNonEmptyString(release) ? release : 'unknown';
}

export function validateReliabilityEvent(event: unknown): ReliabilityValidationResult {
  const errors: string[] = [];
  const value = event as Partial<ReliabilityEventV1> | null;

  if (!value || typeof value !== 'object') {
    return { valid: false, errors: ['event must be an object'] };
  }

  if (value.schemaVersion !== RELIABILITY_SCHEMA_VERSION) {
    errors.push('schemaVersion must be v1');
  }

  if (!isNonEmptyString(value.eventName) || !RELIABILITY_EVENT_NAMES.has(value.eventName as ReliabilityEventName)) {
    errors.push('eventName is invalid');
  }

  if (!isNonEmptyString(value.eventTs) || Number.isNaN(Date.parse(value.eventTs))) {
    errors.push('eventTs must be a valid ISO date string');
  }

  if (!isNonEmptyString(value.requestId)) {
    errors.push('requestId is required');
  }

  if (!isNonEmptyString(value.route) || !RELIABILITY_ROUTES.has(value.route as ReliabilityRoute)) {
    errors.push('route is invalid');
  }

  if (!isNonEmptyString(value.release)) {
    errors.push('release is required');
  }

  const reliability = value.reliability as Record<string, unknown> | undefined;
  if (!reliability || typeof reliability !== 'object') {
    errors.push('reliability is required');
  } else {
    if (reliability.retryAfterMs !== undefined && !isFiniteNumber(reliability.retryAfterMs)) {
      errors.push('reliability.retryAfterMs must be a number when present');
    }

    if (reliability.attemptsUsed !== undefined && !isFiniteNumber(reliability.attemptsUsed)) {
      errors.push('reliability.attemptsUsed must be a number when present');
    }

    if (reliability.status !== undefined && !isFiniteNumber(reliability.status)) {
      errors.push('reliability.status must be a number when present');
    }

    if (reliability.latencyMs !== undefined && !isFiniteNumber(reliability.latencyMs)) {
      errors.push('reliability.latencyMs must be a number when present');
    }

    if (
      reliability.severity !== undefined
      && (!isNonEmptyString(reliability.severity) || !RELIABILITY_SEVERITIES.has(reliability.severity as ReliabilitySeverity))
    ) {
      errors.push('reliability.severity must be warning, critical, or none');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createReliabilityEvent(
  input: Omit<ReliabilityEventV1, 'schemaVersion' | 'eventTs' | 'release'> & {
    eventTs?: string;
    release?: string;
  },
  env: NodeJS.ProcessEnv = process.env,
): ReliabilityEventV1 {
  return {
    schemaVersion: RELIABILITY_SCHEMA_VERSION,
    eventTs: input.eventTs ?? new Date().toISOString(),
    release: input.release ?? resolveRelease(env),
    eventName: input.eventName,
    requestId: input.requestId,
    route: input.route,
    reliability: input.reliability,
  };
}
