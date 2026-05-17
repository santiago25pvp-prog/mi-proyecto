export type RagEvalVariantId = 'current' | 'vector' | 'hybrid' | 'hybrid-rerank';

export interface RagEvalVariant {
  id: RagEvalVariantId;
  label: string;
  env: Partial<NodeJS.ProcessEnv>;
}

const VARIANTS: Record<RagEvalVariantId, RagEvalVariant> = {
  current: {
    id: 'current',
    label: 'Current environment',
    env: {},
  },
  vector: {
    id: 'vector',
    label: 'Vector baseline',
    env: {
      RAG_RETRIEVAL_MODE: 'vector',
      RAG_RERANK_ENABLED: 'false',
    },
  },
  hybrid: {
    id: 'hybrid',
    label: 'Hybrid retrieval',
    env: {
      RAG_RETRIEVAL_MODE: 'hybrid',
      RAG_RERANK_ENABLED: 'false',
    },
  },
  'hybrid-rerank': {
    id: 'hybrid-rerank',
    label: 'Hybrid retrieval + deterministic rerank',
    env: {
      RAG_RETRIEVAL_MODE: 'hybrid',
      RAG_RERANK_ENABLED: 'true',
    },
  },
};

const ALL_VARIANT_IDS: RagEvalVariantId[] = ['vector', 'hybrid', 'hybrid-rerank'];

function isVariantId(value: string): value is RagEvalVariantId {
  return value === 'current' || value === 'vector' || value === 'hybrid' || value === 'hybrid-rerank';
}

export function parseEvalVariants(raw: string | undefined): RagEvalVariant[] {
  if (!raw || raw.trim().length === 0) {
    return [VARIANTS.current];
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'all') {
    return ALL_VARIANT_IDS.map((id) => VARIANTS[id]);
  }

  const requestedIds = normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (requestedIds.length === 0) {
    return [VARIANTS.current];
  }

  return requestedIds.map((id) => {
    if (!isVariantId(id)) {
      throw new Error(`Unknown RAG evaluation variant: ${id}`);
    }

    return VARIANTS[id];
  });
}

export async function withEvalVariantEnv<T>(
  variant: RagEvalVariant,
  fn: () => Promise<T>,
): Promise<T> {
  const previousValues = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(variant.env)) {
    previousValues.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
