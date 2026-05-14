import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateOperationalGate,
  OBSERVABILITY_OVERRIDE_LABEL,
  parseOperationalMode,
  parsePullRequestLabels,
  validateObservabilityOverride,
} from '../../services/observability/operational-override';

test('parseOperationalMode throws for invalid input and normalizes valid values', () => {
  assert.equal(parseOperationalMode(undefined), 'advisory');
  assert.throws(
    () => parseOperationalMode('unknown'),
    /invalid_observability_operational_mode:unknown.expected_one_of:advisory\|soft-block\|hard-block/,
  );
  assert.equal(parseOperationalMode('SOFT-BLOCK'), 'soft-block');
});

test('parsePullRequestLabels parses JSON string array', () => {
  const parsed = parsePullRequestLabels('["a","b"]');
  assert.deepEqual(parsed.labels, ['a', 'b']);
  assert.deepEqual(parsed.errors, []);
});

test('parsePullRequestLabels rejects invalid JSON payload', () => {
  const parsed = parsePullRequestLabels('{bad json}');
  assert.equal(parsed.labels.length, 0);
  assert.ok(parsed.errors.includes('pr_labels_json_invalid'));
});

test('validateObservabilityOverride accepts valid labeled override section', () => {
  const now = new Date('2026-04-29T12:00:00.000Z');
  const result = validateObservabilityOverride({
    prLabels: [OBSERVABILITY_OVERRIDE_LABEL],
    prBody: [
      '## Observability Override',
      'Reason: incident mitigation in progress',
      'Risk: elevated degraded responses',
      'Owner: team-backend-oncall',
      'ExpiresAt: 2026-04-30T12:00:00Z',
      'RollbackPlan: revert deployment and disable feature flag',
    ].join('\n'),
    now,
  });

  assert.equal(result.requested, true);
  assert.equal(result.valid, true);
  assert.equal(result.validationErrors.length, 0);
  assert.equal(result.sectionPresent, true);
  assert.equal(result.expiresAt, '2026-04-30T12:00:00.000Z');
});

test('validateObservabilityOverride rejects missing fields when label is present', () => {
  const result = validateObservabilityOverride({
    prLabels: [OBSERVABILITY_OVERRIDE_LABEL],
    prBody: ['## Observability Override', 'Reason: temporary mitigation', 'Owner: team-backend-oncall'].join('\n'),
    now: new Date('2026-04-29T12:00:00.000Z'),
  });

  assert.equal(result.valid, false);
  assert.ok(result.validationErrors.includes('override_field_missing:Risk'));
  assert.ok(result.validationErrors.includes('override_field_missing:ExpiresAt'));
  assert.ok(result.validationErrors.includes('override_field_missing:RollbackPlan'));
});

test('validateObservabilityOverride rejects expired and over-ttl timestamps', () => {
  const expired = validateObservabilityOverride({
    prLabels: [OBSERVABILITY_OVERRIDE_LABEL],
    prBody: [
      '## Observability Override',
      'Reason: temporary mitigation',
      'Risk: user impact',
      'Owner: team-backend-oncall',
      'ExpiresAt: 2026-04-28T12:00:00Z',
      'RollbackPlan: revert',
    ].join('\n'),
    now: new Date('2026-04-29T12:00:00.000Z'),
  });
  assert.equal(expired.valid, false);
  assert.ok(expired.validationErrors.includes('override_expires_at_expired'));

  const tooLong = validateObservabilityOverride({
    prLabels: [OBSERVABILITY_OVERRIDE_LABEL],
    prBody: [
      '## Observability Override',
      'Reason: temporary mitigation',
      'Risk: user impact',
      'Owner: team-backend-oncall',
      'ExpiresAt: 2026-05-03T12:00:00Z',
      'RollbackPlan: revert',
    ].join('\n'),
    now: new Date('2026-04-29T12:00:00.000Z'),
  });
  assert.equal(tooLong.valid, false);
  assert.ok(tooLong.validationErrors.includes('override_expires_at_ttl_exceeds_72h'));
});

test('evaluateOperationalGate enforces soft-block critical-only behavior', () => {
  const blocked = evaluateOperationalGate({
    mode: 'soft-block',
    findings: [
      { check: 'warn', pass: false, severity: 'warning', details: 'warning breach' },
      { check: 'crit', pass: false, severity: 'critical', details: 'critical breach' },
    ],
    override: {
      requested: false,
      valid: false,
      labelPresent: false,
      sectionPresent: false,
      fields: {
        Reason: null,
        Risk: null,
        Owner: null,
        ExpiresAt: null,
        RollbackPlan: null,
      },
      validationErrors: [],
      expiresAt: null,
      expiresInHours: null,
    },
  });
  assert.equal(blocked.blocked, true);
  assert.deepEqual(blocked.blockingChecks, ['crit']);

  const bypassed = evaluateOperationalGate({
    mode: 'soft-block',
    findings: [{ check: 'crit', pass: false, severity: 'critical', details: 'critical breach' }],
    override: {
      requested: true,
      valid: true,
      labelPresent: true,
      sectionPresent: true,
      fields: {
        Reason: 'x',
        Risk: 'x',
        Owner: 'x',
        ExpiresAt: '2026-04-30T12:00:00.000Z',
        RollbackPlan: 'x',
      },
      validationErrors: [],
      expiresAt: '2026-04-30T12:00:00.000Z',
      expiresInHours: 24,
    },
  });

  assert.equal(bypassed.blocked, false);
  assert.deepEqual(bypassed.bypassedCriticalChecks, ['crit']);
});

test('evaluateOperationalGate enforces hard-block warnings and critical', () => {
  const warningBlocked = evaluateOperationalGate({
    mode: 'hard-block',
    findings: [{ check: 'warn', pass: false, severity: 'warning', details: 'warning breach' }],
    override: {
      requested: true,
      valid: true,
      labelPresent: true,
      sectionPresent: true,
      fields: {
        Reason: 'x',
        Risk: 'x',
        Owner: 'x',
        ExpiresAt: '2026-04-30T12:00:00.000Z',
        RollbackPlan: 'x',
      },
      validationErrors: [],
      expiresAt: '2026-04-30T12:00:00.000Z',
      expiresInHours: 24,
    },
  });

  assert.equal(warningBlocked.blocked, true);
  assert.deepEqual(warningBlocked.blockingChecks, ['warn']);
});
