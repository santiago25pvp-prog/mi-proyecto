import { ReliabilityEventV1, RELIABILITY_SCHEMA_VERSION, validateReliabilityEvent } from './event-schema';

export interface ObservabilityRollbackPlan {
  telemetry: {
    source: 'logs' | 'metrics';
    preserveDegradedSemantics: boolean;
    preserveRequestIdCorrelation: boolean;
    preserveStructuralEventIntegrity: boolean;
  };
  alerts: {
    warningEnabled: boolean;
    criticalEnabled: boolean;
  };
  governance: {
    structuralBlockingEnabled: boolean;
    operationalAdvisoryEnabled: boolean;
  };
}

export interface RollbackGuardResult {
  valid: boolean;
  errors: string[];
}

function includesRequiredEventNames(events: ReliabilityEventV1[]): boolean {
  const required = new Set<string>([
    'query_request_started',
    'query_request_completed',
    'query_request_degraded',
  ]);

  for (const event of events) {
    required.delete(event.eventName);
  }

  return required.size === 0;
}

function allEventsCorrelateByRequestId(events: ReliabilityEventV1[]): boolean {
  return events.every((event) => typeof event.requestId === 'string' && event.requestId.trim().length > 0);
}

export function validateRollbackBoundary(
  plan: ObservabilityRollbackPlan,
  sampleEvents: ReliabilityEventV1[],
): RollbackGuardResult {
  const errors: string[] = [];

  if (!plan.telemetry.preserveDegradedSemantics) {
    errors.push('rollback_boundary:degraded_semantics_must_be_preserved');
  }

  if (!plan.telemetry.preserveRequestIdCorrelation) {
    errors.push('rollback_boundary:request_id_correlation_must_be_preserved');
  }

  if (!plan.telemetry.preserveStructuralEventIntegrity) {
    errors.push('rollback_boundary:structural_event_integrity_must_be_preserved');
  }

  if (!plan.alerts.criticalEnabled) {
    errors.push('rollback_boundary:critical_coverage_must_remain_enabled');
  }

  if (!plan.governance.structuralBlockingEnabled) {
    errors.push('rollback_boundary:structural_blocking_gate_must_remain_enabled');
  }

  if (!includesRequiredEventNames(sampleEvents)) {
    errors.push('rollback_boundary:required_event_families_missing');
  }

  if (!allEventsCorrelateByRequestId(sampleEvents)) {
    errors.push('rollback_boundary:request_id_missing_in_event_sample');
  }

  for (const event of sampleEvents) {
    if (event.schemaVersion !== RELIABILITY_SCHEMA_VERSION) {
      errors.push('rollback_boundary:invalid_schema_version_in_event_sample');
      break;
    }

    const validation = validateReliabilityEvent(event);
    if (!validation.valid) {
      errors.push(`rollback_boundary:invalid_event_sample:${validation.errors.join('|')}`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
