import fs from 'node:fs';
import path from 'node:path';
import { computeCanonicalSlis } from '../../services/observability/sli-computation';
import { createReliabilityEvent } from '../../services/observability/event-schema';
import { evaluateSloPolicy } from '../../services/observability/slo-policy';

interface OperationalResult {
  check: string;
  pass: boolean;
  details: string;
}

function writeReport(results: OperationalResult[]): void {
  const reportPath = path.resolve(process.cwd(), 'observability-operational-report.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    status: results.every((item) => item.pass) ? 'pass' : 'advisory-fail',
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf8');
}

function main(): void {
  const results: OperationalResult[] = [];
  const simulatedEvents = [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'req-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId: 'req-2',
      route: '/query',
      reliability: {
        code: 'UPSTREAM_TEMPORARY_UNAVAILABLE',
        degraded: true,
        retryable: true,
        retryAfterMs: 400,
        latencyMs: 3800,
      },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'req-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 420 },
    }),
    createReliabilityEvent({
      eventName: 'rag_provider_retry_exhausted',
      requestId: 'req-2',
      route: '/query',
      reliability: { degraded: true, retryable: true, attemptsUsed: 3 },
    }),
  ];

  const sli = computeCanonicalSlis(simulatedEvents, {
    startedAt: '2026-04-17T00:00:00.000Z',
    endedAt: '2026-04-17T01:00:00.000Z',
  });
  const policy = evaluateSloPolicy(sli);

  results.push({
    check: 'simulated_window_policy_evaluation',
    pass: policy.severity !== 'critical',
    details: `severity=${policy.severity} reasons=${policy.reasons.join('|') || 'none'}`,
  });

  results.push({
    check: 'taxonomy_integrity',
    pass: sli.integrityFailures.length === 0,
    details: sli.integrityFailures.length === 0 ? 'all required families present' : sli.integrityFailures.join('|'),
  });

  results.push({
    check: 'degraded_baseline_guardrail',
    pass: (sli.degradedResponses.value ?? 0) <= 0.02,
    details: `degraded_rate=${sli.degradedResponses.value ?? 'n/a'} target<=0.02`,
  });

  writeReport(results);

  if (!results.every((item) => item.pass)) {
    process.exitCode = 1;
  }
}

main();
