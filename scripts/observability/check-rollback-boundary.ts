import fs from 'node:fs';
import path from 'node:path';
import { createReliabilityEvent } from '../../services/observability/event-schema';
import { ObservabilityRollbackPlan, validateRollbackBoundary } from '../../services/observability/rollback-guard';

interface RollbackFixture {
  validPlan: ObservabilityRollbackPlan;
  invalidPlan: ObservabilityRollbackPlan;
}

interface RollbackCheckResult {
  check: string;
  pass: boolean;
  details: string;
}

function loadFixture(): RollbackFixture {
  const fixturePath = path.resolve(process.cwd(), 'scripts/observability/fixtures/rollback-boundary-fixture.json');
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw) as RollbackFixture;
}

function sampleEvents() {
  return [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'rollback-check-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'rollback-check-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 220 },
    }),
    createReliabilityEvent({
      eventName: 'query_request_degraded',
      requestId: 'rollback-check-2',
      route: '/query',
      reliability: {
        degraded: true,
        retryable: true,
        code: 'UPSTREAM_TEMPORARY_UNAVAILABLE',
      },
    }),
  ];
}

function main(): void {
  const fixture = loadFixture();
  const events = sampleEvents();

  const validResult = validateRollbackBoundary(fixture.validPlan, events);
  const invalidResult = validateRollbackBoundary(fixture.invalidPlan, events);

  const results: RollbackCheckResult[] = [
    {
      check: 'valid_plan_preserves_minimum_visibility',
      pass: validResult.valid,
      details: validResult.valid ? 'valid rollback plan accepted' : validResult.errors.join('|'),
    },
    {
      check: 'invalid_plan_rejected_by_boundary_guard',
      pass: !invalidResult.valid && invalidResult.errors.length > 0,
      details: invalidResult.errors.join('|') || 'expected guard errors not found',
    },
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    status: results.every((item) => item.pass) ? 'pass' : 'fail',
    fixturePath: 'scripts/observability/fixtures/rollback-boundary-fixture.json',
    results,
    validPlan: validResult,
    invalidPlan: invalidResult,
  };

  const reportPath = path.resolve(process.cwd(), 'observability-rollback-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  if (!results.every((item) => item.pass)) {
    process.exitCode = 1;
  }
}

main();
