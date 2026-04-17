import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import {
  DEGRADED_CODE,
  RagReliabilityError,
  RetryPolicy,
  clampRetryAfterMs,
  classifyProviderError,
  extractRetryHintMs,
} from './rag-reliability';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 1200,
  maxRetryWindowMs: 2000,
  jitterRatio: 0.2,
};

export interface ReliabilityFlags {
  retryEnabled: boolean;
  degradedContractEnabled: boolean;
  fallbackOnTransientEnabled: boolean;
  deterministicEvalEnabled: boolean;
}

export interface GenerateAnswerOptions {
  requestId?: string;
  policy?: RetryPolicy;
  flags?: ReliabilityFlags;
  randomFn?: () => number;
}

export interface GenerationResult {
  answer: string;
  attemptsUsed: number;
  elapsedMs: number;
}

export function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
}

function parsePolicyNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function getReliabilityPolicy(env: NodeJS.ProcessEnv = process.env): RetryPolicy {
  return {
    maxAttempts: Math.max(1, Math.floor(parsePolicyNumber(env.RAG_RETRY_MAX_ATTEMPTS, DEFAULT_RETRY_POLICY.maxAttempts))),
    baseDelayMs: Math.max(1, Math.round(parsePolicyNumber(env.RAG_RETRY_BASE_DELAY_MS, DEFAULT_RETRY_POLICY.baseDelayMs))),
    maxDelayMs: Math.max(1, Math.round(parsePolicyNumber(env.RAG_RETRY_MAX_DELAY_MS, DEFAULT_RETRY_POLICY.maxDelayMs))),
    maxRetryWindowMs: Math.max(1, Math.round(parsePolicyNumber(env.RAG_RETRY_MAX_WINDOW_MS, DEFAULT_RETRY_POLICY.maxRetryWindowMs))),
    jitterRatio: Math.min(1, Math.max(0, parsePolicyNumber(env.RAG_RETRY_JITTER_RATIO, DEFAULT_RETRY_POLICY.jitterRatio))),
  };
}

export function getReliabilityFlags(env: NodeJS.ProcessEnv = process.env): ReliabilityFlags {
  return {
    retryEnabled: parseBooleanFlag(env.RAG_RELIABILITY_RETRY_ENABLED, true),
    degradedContractEnabled: parseBooleanFlag(env.RAG_DEGRADED_CONTRACT_ENABLED, true),
    fallbackOnTransientEnabled: parseBooleanFlag(env.RAG_FALLBACK_ON_TRANSIENT_ENABLED, false),
    deterministicEvalEnabled: parseBooleanFlag(env.RAG_EVAL_DETERMINISTIC_ENABLED, false),
  };
}

const promptTemplate = (context: string, question: string) => `
Responde la pregunta basándote únicamente en el contexto proporcionado. Si la respuesta no está en el contexto, di que no lo sabes.

Contexto:
${context}

Pregunta:
${question}
`;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBaseDelayForAttempt(attempt: number, policy: RetryPolicy): number {
  const exponentialDelay = policy.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(policy.maxDelayMs, Math.round(exponentialDelay));
}

function getJitteredDelay(baseDelayMs: number, jitterRatio: number, randomFn: () => number): number {
  const randomDelta = (randomFn() * 2 - 1) * jitterRatio;
  const jittered = baseDelayMs * (1 + randomDelta);
  return Math.max(1, Math.round(jittered));
}

export const generateAnswerWithReliability = async (
  context: string,
  question: string,
  options: GenerateAnswerOptions = {},
): Promise<GenerationResult> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = promptTemplate(context, question);
  const requestId = options.requestId;
  const policy = options.policy ?? getReliabilityPolicy();
  const flags = options.flags ?? getReliabilityFlags();
  const randomFn = options.randomFn ?? Math.random;
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      return {
        answer: result.response.text(),
        attemptsUsed: attempt,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      const errorClass = classifyProviderError(error);
      const elapsedMs = Date.now() - startedAt;

      if (errorClass === 'TERMINAL_PROVIDER') {
        logger.error('rag_query_terminal_error', {
          requestId,
          errorClass,
          status: (error as { status?: number }).status,
          message: error instanceof Error ? error.message : String(error),
        });

        throw new RagReliabilityError('Terminal provider error', {
          errorClass,
          retryable: false,
          degraded: false,
          status: 502,
          cause: error,
        });
      }

      if (errorClass !== 'TRANSIENT_PROVIDER' || !flags.retryEnabled) {
        throw error;
      }

      const isLastAttempt = attempt >= policy.maxAttempts;
      const nextBaseDelayMs = getBaseDelayForAttempt(attempt, policy);
      const retryHintMs = extractRetryHintMs(error);
      const retryAfterMs = clampRetryAfterMs(retryHintMs ?? nextBaseDelayMs, policy);
      const elapsedWithRetry = elapsedMs + retryAfterMs;
      const exhausted = isLastAttempt || elapsedWithRetry > policy.maxRetryWindowMs;

      if (exhausted) {
        logger.warn('rag_provider_retry_exhausted', {
          requestId,
          attemptsUsed: attempt,
          elapsedMs,
          retryAfterMs,
          lastStatus: (error as { status?: number }).status,
          errorClass: 'TRANSIENT_EXHAUSTED',
        });

        throw new RagReliabilityError('Provider temporarily unavailable after retries', {
          errorClass: 'TRANSIENT_EXHAUSTED',
          code: DEGRADED_CODE,
          retryable: true,
          degraded: true,
          retryAfterMs,
          status: 503,
          cause: error,
        });
      }

      const delayMs = getJitteredDelay(retryAfterMs, policy.jitterRatio, randomFn);
      logger.warn('rag_provider_retry', {
        requestId,
        attempt,
        maxAttempts: policy.maxAttempts,
        delayMs,
        status: (error as { status?: number }).status,
        errorClass,
      });

      await wait(delayMs);
    }
  }

  throw new RagReliabilityError('Provider temporarily unavailable after retries', {
    errorClass: 'TRANSIENT_EXHAUSTED',
    code: DEGRADED_CODE,
    retryable: true,
    degraded: true,
    retryAfterMs: clampRetryAfterMs(policy.baseDelayMs, policy),
    status: 503,
  });
};

export const generateAnswer = async (context: string, question: string) => {
  const result = await generateAnswerWithReliability(context, question);
  return result.answer;
};
