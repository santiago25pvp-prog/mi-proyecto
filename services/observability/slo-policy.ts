import { SliWindowResult } from './sli-computation';

export type SloSeverity = 'warning' | 'critical' | 'none';

export interface SloPolicyV1 {
  version: 'v1';
  effectiveDate: string;
  objectives: {
    availabilityMin: number;
    degradedResponseRateMax: number;
    retryExhaustionRateMax: number;
    p95LatencyMsMax: number;
  };
}

export interface SloEvaluation {
  severity: SloSeverity;
  reasons: string[];
  policyVersion: string;
}

export const PHASE_A_SLO_POLICY: SloPolicyV1 = {
  version: 'v1',
  effectiveDate: '2026-04-17',
  objectives: {
    availabilityMin: 0.995,
    degradedResponseRateMax: 0.02,
    retryExhaustionRateMax: 0.005,
    p95LatencyMsMax: 3000,
  },
};

function classifyLevel(
  condition: { warning: boolean; critical: boolean },
  reasons: string[],
  warningReason: string,
  criticalReason: string,
): SloSeverity {
  if (condition.critical) {
    reasons.push(criticalReason);
    return 'critical';
  }

  if (condition.warning) {
    reasons.push(warningReason);
    return 'warning';
  }

  return 'none';
}

function highestSeverity(a: SloSeverity, b: SloSeverity): SloSeverity {
  if (a === 'critical' || b === 'critical') {
    return 'critical';
  }

  if (a === 'warning' || b === 'warning') {
    return 'warning';
  }

  return 'none';
}

export function evaluateSloPolicy(result: SliWindowResult, policy: SloPolicyV1 = PHASE_A_SLO_POLICY): SloEvaluation {
  const reasons: string[] = [];
  let severity: SloSeverity = 'none';

  if (result.successfulNonDegraded.invalidForEnforcement || result.degradedResponses.invalidForEnforcement) {
    return {
      severity: 'warning',
      reasons: ['invalid_for_enforcement:missing_query_taxonomy'],
      policyVersion: policy.version,
    };
  }

  const availability = result.successfulNonDegraded.value ?? 0;
  const degradedRate = result.degradedResponses.value ?? 1;
  const retryExhaustionRate = result.retryExhaustedProviderCalls.value ?? 1;
  const p95LatencyMs = result.p95LatencyMs.value ?? Number.POSITIVE_INFINITY;

  const availabilitySeverity = classifyLevel(
    {
      warning: availability < policy.objectives.availabilityMin,
      critical: availability < 0.99,
    },
    reasons,
    'availability_warning_breach',
    'availability_critical_breach',
  );

  const degradedSeverity = classifyLevel(
    {
      warning: degradedRate > policy.objectives.degradedResponseRateMax,
      critical: degradedRate > 0.04,
    },
    reasons,
    'degraded_response_warning_breach',
    'degraded_response_critical_breach',
  );

  const retrySeverity = classifyLevel(
    {
      warning: retryExhaustionRate > policy.objectives.retryExhaustionRateMax,
      critical: retryExhaustionRate > 0.01,
    },
    reasons,
    'retry_exhaustion_warning_breach',
    'retry_exhaustion_critical_breach',
  );

  const latencySeverity = classifyLevel(
    {
      warning: p95LatencyMs > 3300,
      critical: p95LatencyMs > 4000,
    },
    reasons,
    'latency_warning_breach',
    'latency_critical_breach',
  );

  severity = highestSeverity(severity, availabilitySeverity);
  severity = highestSeverity(severity, degradedSeverity);
  severity = highestSeverity(severity, retrySeverity);
  severity = highestSeverity(severity, latencySeverity);

  return {
    severity,
    reasons,
    policyVersion: policy.version,
  };
}
