import logger from './logger';

export type RetrievalMode = 'vector' | 'hybrid';

export interface RetrievalConfig {
  mode: RetrievalMode;
  vectorWeight: number;
  ftsWeight: number;
}

const DEFAULT_MODE: RetrievalMode = 'vector';
const DEFAULT_VECTOR_WEIGHT = 0.7;
const DEFAULT_FTS_WEIGHT = 0.3;

function parseMode(raw: string | undefined): RetrievalMode {
  if (!raw) {
    return DEFAULT_MODE;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'vector' || normalized === 'hybrid') {
    return normalized;
  }

  logger.warn('retrieval_config_invalid_mode', {
    envVar: 'RAG_RETRIEVAL_MODE',
    value: raw,
    fallback: DEFAULT_MODE,
  });

  return DEFAULT_MODE;
}

function parseWeight(raw: string | undefined, envVar: string, fallback: number): number {
  if (!raw || raw.trim().length === 0) {
    logger.warn('retrieval_config_missing_weight', {
      envVar,
      fallback,
    });
    return fallback;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    logger.warn('retrieval_config_invalid_weight', {
      envVar,
      value: raw,
      fallback,
    });
    return fallback;
  }

  return parsed;
}

export function getRetrievalConfig(env: NodeJS.ProcessEnv = process.env): RetrievalConfig {
  const mode = parseMode(env.RAG_RETRIEVAL_MODE);
  const vectorWeight = parseWeight(env.RAG_VECTOR_WEIGHT, 'RAG_VECTOR_WEIGHT', DEFAULT_VECTOR_WEIGHT);
  const ftsWeight = parseWeight(env.RAG_FTS_WEIGHT, 'RAG_FTS_WEIGHT', DEFAULT_FTS_WEIGHT);
  const weightSum = vectorWeight + ftsWeight;

  if (weightSum <= 0) {
    logger.warn('retrieval_config_invalid_weight_sum', {
      vectorWeight,
      ftsWeight,
      fallback: {
        vectorWeight: DEFAULT_VECTOR_WEIGHT,
        ftsWeight: DEFAULT_FTS_WEIGHT,
      },
    });

    return {
      mode,
      vectorWeight: DEFAULT_VECTOR_WEIGHT,
      ftsWeight: DEFAULT_FTS_WEIGHT,
    };
  }

  return {
    mode,
    vectorWeight: vectorWeight / weightSum,
    ftsWeight: ftsWeight / weightSum,
  };
}
