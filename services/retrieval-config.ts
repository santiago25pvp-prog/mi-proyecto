import logger from './logger';

export type RetrievalMode = 'vector' | 'hybrid';

export interface RetrievalConfig {
  mode: RetrievalMode;
  vectorWeight: number;
  ftsWeight: number;
  rerank: RerankConfig;
}

export interface RerankConfig {
  enabled: boolean;
  overlapWeight: number;
  similarityWeight: number;
  freshnessWeight: number;
}

const DEFAULT_MODE: RetrievalMode = 'vector';
const DEFAULT_VECTOR_WEIGHT = 0.7;
const DEFAULT_FTS_WEIGHT = 0.3;
const DEFAULT_RERANK_ENABLED = false;
const DEFAULT_RERANK_OVERLAP_WEIGHT = 0.5;
const DEFAULT_RERANK_SIMILARITY_WEIGHT = 0.4;
const DEFAULT_RERANK_FRESHNESS_WEIGHT = 0.1;

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

function parseRerankWeight(raw: string | undefined, envVar: string, fallback: number): { valid: boolean; value: number } {
  if (!raw || raw.trim().length === 0) {
    logger.warn('retrieval_config_missing_weight', {
      envVar,
      fallback,
    });
    return { valid: true, value: fallback };
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    logger.warn('retrieval_config_invalid_weight', {
      envVar,
      value: raw,
      fallback,
    });
    return { valid: false, value: fallback };
  }

  return { valid: true, value: parsed };
}

function parseBoolean(raw: string | undefined, envVar: string, fallback: boolean): boolean {
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  logger.warn('retrieval_config_invalid_boolean', {
    envVar,
    value: raw,
    fallback,
  });

  return fallback;
}

function normalizeRerankWeights(
  overlapWeight: number,
  similarityWeight: number,
  freshnessWeight: number,
): Omit<RerankConfig, 'enabled'> {
  const weightSum = overlapWeight + similarityWeight + freshnessWeight;

  if (weightSum <= 0) {
    logger.warn('retrieval_config_invalid_rerank_weight_sum', {
      overlapWeight,
      similarityWeight,
      freshnessWeight,
      fallback: {
        overlapWeight: DEFAULT_RERANK_OVERLAP_WEIGHT,
        similarityWeight: DEFAULT_RERANK_SIMILARITY_WEIGHT,
        freshnessWeight: DEFAULT_RERANK_FRESHNESS_WEIGHT,
      },
    });

    return {
      overlapWeight: DEFAULT_RERANK_OVERLAP_WEIGHT,
      similarityWeight: DEFAULT_RERANK_SIMILARITY_WEIGHT,
      freshnessWeight: DEFAULT_RERANK_FRESHNESS_WEIGHT,
    };
  }

  return {
    overlapWeight: overlapWeight / weightSum,
    similarityWeight: similarityWeight / weightSum,
    freshnessWeight: freshnessWeight / weightSum,
  };
}

export function getRetrievalConfig(env: NodeJS.ProcessEnv = process.env): RetrievalConfig {
  const mode = parseMode(env.RAG_RETRIEVAL_MODE);
  const vectorWeight = parseWeight(env.RAG_VECTOR_WEIGHT, 'RAG_VECTOR_WEIGHT', DEFAULT_VECTOR_WEIGHT);
  const ftsWeight = parseWeight(env.RAG_FTS_WEIGHT, 'RAG_FTS_WEIGHT', DEFAULT_FTS_WEIGHT);
  const rerankEnabled = parseBoolean(env.RAG_RERANK_ENABLED, 'RAG_RERANK_ENABLED', DEFAULT_RERANK_ENABLED);
  const rerankOverlapWeight = parseRerankWeight(
    env.RAG_RERANK_OVERLAP_WEIGHT,
    'RAG_RERANK_OVERLAP_WEIGHT',
    DEFAULT_RERANK_OVERLAP_WEIGHT,
  );
  const rerankSimilarityWeight = parseRerankWeight(
    env.RAG_RERANK_SIMILARITY_WEIGHT,
    'RAG_RERANK_SIMILARITY_WEIGHT',
    DEFAULT_RERANK_SIMILARITY_WEIGHT,
  );
  const rerankFreshnessWeight = parseRerankWeight(
    env.RAG_RERANK_FRESHNESS_WEIGHT,
    'RAG_RERANK_FRESHNESS_WEIGHT',
    DEFAULT_RERANK_FRESHNESS_WEIGHT,
  );
  const hasInvalidRerankWeight =
    !rerankOverlapWeight.valid
    || !rerankSimilarityWeight.valid
    || !rerankFreshnessWeight.valid;
  const rerankWeights = hasInvalidRerankWeight
    ? {
      overlapWeight: DEFAULT_RERANK_OVERLAP_WEIGHT,
      similarityWeight: DEFAULT_RERANK_SIMILARITY_WEIGHT,
      freshnessWeight: DEFAULT_RERANK_FRESHNESS_WEIGHT,
    }
    : normalizeRerankWeights(
      rerankOverlapWeight.value,
      rerankSimilarityWeight.value,
      rerankFreshnessWeight.value,
    );
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
      rerank: {
        enabled: rerankEnabled,
        ...rerankWeights,
      },
    };
  }

  return {
    mode,
    vectorWeight: vectorWeight / weightSum,
    ftsWeight: ftsWeight / weightSum,
    rerank: {
      enabled: rerankEnabled,
      ...rerankWeights,
    },
  };
}
