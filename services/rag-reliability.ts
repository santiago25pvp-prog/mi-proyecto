import { GoogleGenerativeAIFetchError } from '@google/generative-ai';

export type RagErrorClass =
  | 'TRANSIENT_PROVIDER'
  | 'TRANSIENT_EXHAUSTED'
  | 'TERMINAL_PROVIDER'
  | 'TERMINAL_REQUEST'
  | 'INTERNAL_UNKNOWN';

export const DEGRADED_CODE = 'UPSTREAM_TEMPORARY_UNAVAILABLE' as const;

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetryWindowMs: number;
  jitterRatio: number;
}

const TRANSIENT_STATUS_CODES = new Set([429, 500, 503]);
const TERMINAL_PROVIDER_STATUS_CODES = new Set([400, 401, 403, 404, 422]);
const NETWORK_TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ECONNABORTED',
  'EAI_AGAIN',
  'ENETUNREACH',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function getErrorStatus(error: unknown): number | null {
  if (error instanceof GoogleGenerativeAIFetchError) {
    return typeof error.status === 'number' ? error.status : null;
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }

  return null;
}

function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

export function classifyProviderError(error: unknown): RagErrorClass {
  const status = getErrorStatus(error);

  if (status !== null && TRANSIENT_STATUS_CODES.has(status)) {
    return 'TRANSIENT_PROVIDER';
  }

  if (status !== null && TERMINAL_PROVIDER_STATUS_CODES.has(status)) {
    return 'TERMINAL_PROVIDER';
  }

  const code = getErrorCode(error);
  if (code && NETWORK_TRANSIENT_CODES.has(code)) {
    return 'TRANSIENT_PROVIDER';
  }

  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes('timeout')
    || message.includes('temporarily unavailable')
    || message.includes('connection reset')
  ) {
    return 'TRANSIENT_PROVIDER';
  }

  return 'INTERNAL_UNKNOWN';
}

export function extractRetryHintMs(error: unknown): number | null {
  const message = getErrorMessage(error);
  const match = message.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*s/i);

  if (!match || !match[1]) {
    return null;
  }

  const seconds = Number.parseFloat(match[1]);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.round(seconds * 1000);
}

export function clampRetryAfterMs(value: number, policy: RetryPolicy): number {
  const min = Math.max(1, policy.baseDelayMs);
  const max = Math.max(min, policy.maxDelayMs);
  return Math.min(max, Math.max(min, Math.round(value)));
}

export class RagReliabilityError extends Error {
  errorClass: RagErrorClass;
  code?: string;
  retryable: boolean;
  degraded: boolean;
  retryAfterMs?: number;
  status?: number;

  constructor(
    message: string,
    options: {
      errorClass: RagErrorClass;
      code?: string;
      retryable: boolean;
      degraded: boolean;
      retryAfterMs?: number;
      status?: number;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'RagReliabilityError';
    this.errorClass = options.errorClass;
    this.code = options.code;
    this.retryable = options.retryable;
    this.degraded = options.degraded;
    this.retryAfterMs = options.retryAfterMs;
    this.status = options.status;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isRagReliabilityError(error: unknown): error is RagReliabilityError {
  return error instanceof RagReliabilityError;
}
