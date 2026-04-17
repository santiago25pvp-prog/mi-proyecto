import assert from 'node:assert/strict';
import test from 'node:test';

import { validateAlertRule } from '../../services/observability/alert-rules';

test('validateAlertRule accepts warning and critical with ownership metadata', () => {
  const validation = validateAlertRule({
    id: 'degraded-warning',
    sli: 'degraded_response_rate',
    severity: 'warning',
    condition: {
      window: '6h',
      operator: '>',
      value: 0.02,
      evaluationPeriods: 2,
    },
    ownership: {
      primaryOwner: 'team-backend-oncall',
      secondaryOwner: 'team-platform-oncall',
      escalationPath: '#incident-backend',
    },
    runbookUrl: 'docs/runbooks/rag-reliability.md',
    correlationQueryRef: 'requestId:req-*',
    dedupeKeyTemplate: 'degraded-warning-{window}',
    enabled: true,
    policyVersion: 'v1',
  });

  assert.equal(validation.valid, true);
});

test('validateAlertRule rejects ownerless definitions', () => {
  const validation = validateAlertRule({
    id: 'bad-rule',
    sli: 'availability',
    severity: 'critical',
    condition: {
      window: '1h',
      operator: '<',
      value: 0.99,
      evaluationPeriods: 1,
    },
    ownership: {
      primaryOwner: '',
      secondaryOwner: '',
      escalationPath: '',
    },
    runbookUrl: '',
    correlationQueryRef: '',
    dedupeKeyTemplate: '',
    enabled: true,
    policyVersion: 'v1',
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.includes('ownership.primaryOwner')));
  assert.ok(validation.errors.some((item) => item.includes('runbookUrl')));
});
