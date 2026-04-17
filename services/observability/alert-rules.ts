export type AlertSli = 'availability' | 'degraded_response_rate' | 'retry_exhaustion_rate' | 'p95_latency';
export type AlertSeverity = 'warning' | 'critical';
export type AlertWindow = '30m' | '1h' | '2h' | '6h' | '24h';
export type AlertOperator = '>' | '<';

export interface SloAlertRuleV1 {
  id: string;
  sli: AlertSli;
  severity: AlertSeverity;
  condition: {
    window: AlertWindow;
    operator: AlertOperator;
    value: number;
    evaluationPeriods: number;
  };
  ownership: {
    primaryOwner: string;
    secondaryOwner: string;
    escalationPath: string;
  };
  runbookUrl: string;
  correlationQueryRef: string;
  dedupeKeyTemplate: string;
  enabled: boolean;
  policyVersion: string;
}

export interface AlertRuleValidation {
  valid: boolean;
  errors: string[];
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const ALERT_SLI_VALUES = new Set<AlertSli>([
  'availability',
  'degraded_response_rate',
  'retry_exhaustion_rate',
  'p95_latency',
]);

const ALERT_WINDOW_VALUES = new Set<AlertWindow>(['30m', '1h', '2h', '6h', '24h']);
const ALERT_OPERATOR_VALUES = new Set<AlertOperator>(['>', '<']);
const ALERT_SEVERITY_VALUES = new Set<AlertSeverity>(['warning', 'critical']);

export function validateAlertRule(rule: unknown): AlertRuleValidation {
  const errors: string[] = [];
  const value = rule as Partial<SloAlertRuleV1> | null;

  if (!value || typeof value !== 'object') {
    return { valid: false, errors: ['rule must be an object'] };
  }

  if (!isNonEmpty(value.id)) {
    errors.push('id is required');
  }

  if (!isNonEmpty(value.sli) || !ALERT_SLI_VALUES.has(value.sli as AlertSli)) {
    errors.push('sli must be one of availability|degraded_response_rate|retry_exhaustion_rate|p95_latency');
  }

  if (!isNonEmpty(value.severity) || !ALERT_SEVERITY_VALUES.has(value.severity as AlertSeverity)) {
    errors.push('severity must be warning or critical');
  }

  const condition = value.condition as SloAlertRuleV1['condition'] | undefined;
  if (!condition) {
    errors.push('condition is required');
  } else {
    if (!isNonEmpty(condition.window) || !ALERT_WINDOW_VALUES.has(condition.window as AlertWindow)) {
      errors.push('condition.window is invalid');
    }

    if (!isNonEmpty(condition.operator) || !ALERT_OPERATOR_VALUES.has(condition.operator as AlertOperator)) {
      errors.push('condition.operator is invalid');
    }

    if (typeof condition.value !== 'number' || !Number.isFinite(condition.value)) {
      errors.push('condition.value must be a number');
    }

    if (!Number.isInteger(condition.evaluationPeriods) || condition.evaluationPeriods <= 0) {
      errors.push('condition.evaluationPeriods must be a positive integer');
    }
  }

  const ownership = value.ownership as SloAlertRuleV1['ownership'] | undefined;
  if (!ownership) {
    errors.push('ownership is required');
  } else {
    if (!isNonEmpty(ownership.primaryOwner)) {
      errors.push('ownership.primaryOwner is required');
    }

    if (!isNonEmpty(ownership.secondaryOwner)) {
      errors.push('ownership.secondaryOwner is required');
    }

    if (!isNonEmpty(ownership.escalationPath)) {
      errors.push('ownership.escalationPath is required');
    }
  }

  if (!isNonEmpty(value.runbookUrl)) {
    errors.push('runbookUrl is required');
  }

  if (!isNonEmpty(value.correlationQueryRef)) {
    errors.push('correlationQueryRef is required');
  }

  if (!isNonEmpty(value.dedupeKeyTemplate)) {
    errors.push('dedupeKeyTemplate is required');
  }

  if (typeof value.enabled !== 'boolean') {
    errors.push('enabled must be boolean');
  }

  if (!isNonEmpty(value.policyVersion)) {
    errors.push('policyVersion is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
