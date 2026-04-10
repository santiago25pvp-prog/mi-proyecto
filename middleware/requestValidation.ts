import { RequestHandler, Response } from 'express';
import { HttpError } from './httpError';

type Source = 'body' | 'query' | 'params';
type RuleType = 'string' | 'int' | 'url';

type Rule = {
  source: Source;
  field: string;
  type: RuleType;
  required?: boolean;
  requiredMessage?: string;
  trim?: boolean;
  minLength?: number;
  min?: number;
  max?: number;
  defaultValue?: string | number;
  defaultValid?: boolean;
  allowEmpty?: boolean;
  message?: string;
};

export type ValidatedRequestData = {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
};

function getSourceValue(source: Source, field: string, req: any): unknown {
  return req[source]?.[field];
}

function setSourceValue(target: ValidatedRequestData, source: Source, field: string, value: unknown): void {
  target[source][field] = value;
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return null;
}

function validateUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function formatMessage(rule: Rule, fallback: string): string {
  return rule.message ?? fallback;
}

export function validateRequest(rules: Rule[]): RequestHandler {
  return (req, res, next) => {
    const validated: ValidatedRequestData = { body: {}, query: {}, params: {} };
    const errors: string[] = [];

    for (const rule of rules) {
      const rawValue = getSourceValue(rule.source, rule.field, req);

      if (!isPresent(rawValue)) {
        if (rule.defaultValue !== undefined) {
          setSourceValue(validated, rule.source, rule.field, rule.defaultValue);
          continue;
        }

        if (rule.required) {
          errors.push(rule.requiredMessage ?? `${rule.field} is required`);
        }

        continue;
      }

      if (rule.type === 'string') {
        if (typeof rawValue !== 'string') {
          errors.push(formatMessage(rule, `${rule.field} must be a string`));
          continue;
        }

        const processed = rule.trim ? rawValue.trim() : rawValue;

        if (!rule.allowEmpty && processed.length === 0) {
          errors.push(rule.requiredMessage ?? `${rule.field} is required`);
          continue;
        }

        if (rule.minLength !== undefined && processed.length < rule.minLength) {
          errors.push(formatMessage(rule, `${rule.field} must be at least ${rule.minLength} characters`));
          continue;
        }

        setSourceValue(validated, rule.source, rule.field, processed);
        continue;
      }

      if (rule.type === 'int') {
        const parsed = parseInteger(rawValue);

        if (parsed === null) {
          errors.push(formatMessage(rule, `${rule.field} must be a positive integer`));
          continue;
        }

        if (rule.min !== undefined && parsed < rule.min) {
          errors.push(formatMessage(rule, `${rule.field} must be greater than or equal to ${rule.min}`));
          continue;
        }

        if (rule.max !== undefined && parsed > rule.max) {
          errors.push(formatMessage(rule, `${rule.field} must be less than or equal to ${rule.max}`));
          continue;
        }

        setSourceValue(validated, rule.source, rule.field, parsed);
        continue;
      }

      if (rule.type === 'url') {
        const parsed = validateUrl(rawValue);

        if (!parsed) {
          errors.push(formatMessage(rule, `${rule.field} must be a valid http or https URL`));
          continue;
        }

        setSourceValue(validated, rule.source, rule.field, parsed);
      }
    }

    if (errors.length > 0) {
      return next(new HttpError('Invalid request', 400, errors));
    }

    res.locals.validated = validated;
    next();
  };
}

export function getValidatedRequest(res: Response): ValidatedRequestData {
  return (res.locals.validated as ValidatedRequestData) ?? { body: {}, query: {}, params: {} };
}
