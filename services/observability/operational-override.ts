export type OperationalMode = 'advisory' | 'soft-block' | 'hard-block';
export type OperationalSeverity = 'warning' | 'critical';

export const OBSERVABILITY_OVERRIDE_LABEL = 'ops-override-observability';
export const OBSERVABILITY_OVERRIDE_REQUIRED_FIELDS = [
  'Reason',
  'Risk',
  'Owner',
  'ExpiresAt',
  'RollbackPlan',
] as const;

type OverrideRequiredField = (typeof OBSERVABILITY_OVERRIDE_REQUIRED_FIELDS)[number];

export interface OperationalFinding {
  check: string;
  pass: boolean;
  severity: OperationalSeverity;
  details: string;
}

export interface ObservabilityOverrideValidation {
  requested: boolean;
  valid: boolean;
  labelPresent: boolean;
  sectionPresent: boolean;
  fields: Record<OverrideRequiredField, string | null>;
  validationErrors: string[];
  expiresAt: string | null;
  expiresInHours: number | null;
}

export interface OperationalGateEvaluation {
  mode: OperationalMode;
  blocked: boolean;
  blockingChecks: string[];
  bypassedCriticalChecks: string[];
}

const MODE_VALUES = new Set<OperationalMode>(['advisory', 'soft-block', 'hard-block']);

const ISO_8601_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function emptyFields(): Record<OverrideRequiredField, string | null> {
  return {
    Reason: null,
    Risk: null,
    Owner: null,
    ExpiresAt: null,
    RollbackPlan: null,
  };
}

function extractSection(prBody: string): string | null {
  const lines = prBody.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => /^#{1,6}\s*Observability Override\b/i.test(line.trim()));

  if (startIndex === -1) {
    return null;
  }

  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (/^#{1,6}\s+/.test(line.trim())) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines.join('\n').trim();
}

function extractFieldValue(section: string, field: OverrideRequiredField): string | null {
  const expression = new RegExp(
    String.raw`(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?${field}(?:\*\*)?\s*:\s*(.+)`,
    'i',
  );
  const match = expression.exec(section);
  if (!match || typeof match[1] !== 'string') {
    return null;
  }

  const value = match[1].trim();
  return value.length > 0 ? value : null;
}

export function parseOperationalMode(value: string | undefined): OperationalMode {
  if (!value) {
    return 'advisory';
  }

  const normalized = value.trim().toLowerCase() as OperationalMode;
  return MODE_VALUES.has(normalized) ? normalized : 'advisory';
}

export function parsePullRequestLabels(rawLabelsJson: string | undefined): { labels: string[]; errors: string[] } {
  if (!rawLabelsJson || rawLabelsJson.trim().length === 0) {
    return { labels: [], errors: [] };
  }

  try {
    const parsed = JSON.parse(rawLabelsJson) as unknown;
    if (!Array.isArray(parsed)) {
      return { labels: [], errors: ['pr_labels_json_must_be_array'] };
    }

    const labels = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return { labels, errors: [] };
  } catch {
    return { labels: [], errors: ['pr_labels_json_invalid'] };
  }
}

export function validateObservabilityOverride(input: {
  prLabels: string[];
  prBody: string;
  now?: Date;
  maxTtlHours?: number;
}): ObservabilityOverrideValidation {
  const now = input.now ?? new Date();
  const maxTtlHours = input.maxTtlHours ?? 72;
  const fields = emptyFields();
  const validationErrors: string[] = [];
  const labelPresent = input.prLabels.includes(OBSERVABILITY_OVERRIDE_LABEL);
  const requested = labelPresent;

  const section = extractSection(input.prBody ?? '');
  const sectionPresent = section !== null;

  let expiresAt: string | null = null;
  let expiresInHours: number | null = null;

  for (const field of OBSERVABILITY_OVERRIDE_REQUIRED_FIELDS) {
    fields[field] = section ? extractFieldValue(section, field) : null;
    if (labelPresent && !fields[field]) {
      validationErrors.push(`override_field_missing:${field}`);
    }
  }

  const expiresAtRaw = fields.ExpiresAt;
  if (labelPresent && expiresAtRaw) {
    if (!ISO_8601_TIMESTAMP.test(expiresAtRaw)) {
      validationErrors.push('override_expires_at_invalid_iso8601');
    } else {
      const parsed = new Date(expiresAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        validationErrors.push('override_expires_at_invalid_date');
      } else {
        expiresAt = parsed.toISOString();
        const ttlMs = parsed.getTime() - now.getTime();
        expiresInHours = ttlMs / (60 * 60 * 1000);
        if (ttlMs <= 0) {
          validationErrors.push('override_expires_at_expired');
        }
        if (ttlMs > maxTtlHours * 60 * 60 * 1000) {
          validationErrors.push(`override_expires_at_ttl_exceeds_${maxTtlHours}h`);
        }
      }
    }
  }

  if (labelPresent && !sectionPresent) {
    validationErrors.push('override_section_missing:Observability Override');
  }

  const valid = labelPresent && sectionPresent && validationErrors.length === 0;

  return {
    requested,
    valid,
    labelPresent,
    sectionPresent,
    fields,
    validationErrors,
    expiresAt,
    expiresInHours,
  };
}

export function evaluateOperationalGate(input: {
  mode: OperationalMode;
  findings: OperationalFinding[];
  override: ObservabilityOverrideValidation;
}): OperationalGateEvaluation {
  const failingWarnings = input.findings.filter((item) => !item.pass && item.severity === 'warning');
  const failingCritical = input.findings.filter((item) => !item.pass && item.severity === 'critical');

  if (input.mode === 'advisory') {
    return {
      mode: input.mode,
      blocked: false,
      blockingChecks: [],
      bypassedCriticalChecks: [],
    };
  }

  if (input.mode === 'soft-block') {
    if (failingCritical.length === 0) {
      return {
        mode: input.mode,
        blocked: false,
        blockingChecks: [],
        bypassedCriticalChecks: [],
      };
    }

    if (input.override.valid) {
      return {
        mode: input.mode,
        blocked: false,
        blockingChecks: [],
        bypassedCriticalChecks: failingCritical.map((item) => item.check),
      };
    }

    return {
      mode: input.mode,
      blocked: true,
      blockingChecks: failingCritical.map((item) => item.check),
      bypassedCriticalChecks: [],
    };
  }

  if (failingWarnings.length > 0) {
    return {
      mode: input.mode,
      blocked: true,
      blockingChecks: failingWarnings.map((item) => item.check),
      bypassedCriticalChecks: [],
    };
  }

  if (failingCritical.length === 0) {
    return {
      mode: input.mode,
      blocked: false,
      blockingChecks: [],
      bypassedCriticalChecks: [],
    };
  }

  if (input.override.valid) {
    return {
      mode: input.mode,
      blocked: false,
      blockingChecks: [],
      bypassedCriticalChecks: failingCritical.map((item) => item.check),
    };
  }

  return {
    mode: input.mode,
    blocked: true,
    blockingChecks: failingCritical.map((item) => item.check),
    bypassedCriticalChecks: [],
  };
}
