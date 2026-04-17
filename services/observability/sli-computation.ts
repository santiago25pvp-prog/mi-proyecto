import {
  ReliabilityEventV1,
  RELIABILITY_SCHEMA_VERSION,
  validateReliabilityEvent,
} from './event-schema';

export interface SliMetricResult {
  value: number | null;
  numerator: number;
  denominator: number;
  invalidForEnforcement: boolean;
}

export interface SliWindowResult {
  formulaVersion: 'v1';
  window: {
    startedAt: string;
    endedAt: string;
  };
  eligibleQueryRequests: number;
  successfulNonDegraded: SliMetricResult;
  degradedResponses: SliMetricResult;
  retryExhaustedProviderCalls: SliMetricResult;
  p95LatencyMs: {
    value: number | null;
    invalidForEnforcement: boolean;
  };
  classifiedReliabilityErrors: {
    total: number;
    byCode: Record<string, number>;
  };
  integrityFailures: string[];
}

export interface ComputeSliOptions {
  startedAt: string;
  endedAt: string;
}

function percentile95(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, position))] ?? null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function toMetricResult(numerator: number, denominator: number, invalidForEnforcement: boolean): SliMetricResult {
  return {
    value: ratio(numerator, denominator),
    numerator,
    denominator,
    invalidForEnforcement,
  };
}

function uniqueRequestIds(events: ReliabilityEventV1[], eventName: ReliabilityEventV1['eventName']): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.eventName === eventName) {
      ids.add(event.requestId);
    }
  }
  return ids;
}

export function computeCanonicalSlis(
  events: ReliabilityEventV1[],
  options: ComputeSliOptions,
): SliWindowResult {
  const integrityFailures: string[] = [];
  const validEvents: ReliabilityEventV1[] = [];

  for (const event of events) {
    const validation = validateReliabilityEvent(event);
    if (!validation.valid || event.schemaVersion !== RELIABILITY_SCHEMA_VERSION) {
      integrityFailures.push(`invalid_event:${validation.errors.join(';')}`);
      continue;
    }
    validEvents.push(event);
  }

  const startedRequests = uniqueRequestIds(validEvents, 'query_request_started');
  const completedRequests = new Set<string>();
  const degradedRequests = new Set<string>();
  const classifiedErrors: Record<string, number> = {};
  const latencyValues: number[] = [];

  let retryExhaustedProviderCalls = 0;
  let totalProviderCalls = 0;

  for (const event of validEvents) {
    if (!startedRequests.has(event.requestId) && event.route === '/query') {
      continue;
    }

    if (event.eventName === 'query_request_completed') {
      completedRequests.add(event.requestId);
      if (typeof event.reliability.latencyMs === 'number') {
        latencyValues.push(event.reliability.latencyMs);
      }
    }

    if (event.eventName === 'query_request_degraded' || event.eventName === 'rag_query_degraded_response') {
      degradedRequests.add(event.requestId);
      if (typeof event.reliability.latencyMs === 'number') {
        latencyValues.push(event.reliability.latencyMs);
      }
    }

    if (event.eventName === 'rag_provider_retry') {
      totalProviderCalls += 1;
    }

    if (event.eventName === 'rag_provider_retry_exhausted') {
      retryExhaustedProviderCalls += 1;
      totalProviderCalls += 1;
    }

    if (event.reliability.code) {
      const code = event.reliability.code;
      classifiedErrors[code] = (classifiedErrors[code] ?? 0) + 1;
    }
  }

  const eligibleQueryRequests = startedRequests.size;
  const successfulNonDegradedCount = [...completedRequests].filter((requestId) => !degradedRequests.has(requestId)).length;
  const degradedResponsesCount = degradedRequests.size;

  if (eligibleQueryRequests === 0) {
    integrityFailures.push('missing_event_family:query_request_started');
  }

  if (latencyValues.length === 0) {
    integrityFailures.push('missing_event_family:latency');
  }

  if (totalProviderCalls === 0) {
    integrityFailures.push('missing_event_family:provider_calls');
  }

  const invalidQueryDerived = eligibleQueryRequests === 0;
  const invalidProviderDerived = totalProviderCalls === 0;

  return {
    formulaVersion: 'v1',
    window: {
      startedAt: options.startedAt,
      endedAt: options.endedAt,
    },
    eligibleQueryRequests,
    successfulNonDegraded: toMetricResult(successfulNonDegradedCount, eligibleQueryRequests, invalidQueryDerived),
    degradedResponses: toMetricResult(degradedResponsesCount, eligibleQueryRequests, invalidQueryDerived),
    retryExhaustedProviderCalls: toMetricResult(retryExhaustedProviderCalls, totalProviderCalls, invalidProviderDerived),
    p95LatencyMs: {
      value: percentile95(latencyValues),
      invalidForEnforcement: latencyValues.length === 0,
    },
    classifiedReliabilityErrors: {
      total: Object.values(classifiedErrors).reduce((sum, count) => sum + count, 0),
      byCode: classifiedErrors,
    },
    integrityFailures,
  };
}
