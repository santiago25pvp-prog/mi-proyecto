import type { SearchResult } from './vector-store.interface';

export interface RerankWeights {
  overlapWeight: number;
  similarityWeight: number;
  freshnessWeight: number;
}

export interface RerankOptions {
  now?: Date;
}

interface ScoredResult {
  result: SearchResult;
  index: number;
  score: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function calculateOverlap(queryTokens: Set<string>, result: SearchResult): number {
  if (queryTokens.size === 0) {
    return 0;
  }

  const documentTokens = new Set(tokenize(`${result.document.name} ${result.document.content}`));
  let matched = 0;

  for (const token of queryTokens) {
    if (documentTokens.has(token)) {
      matched += 1;
    }
  }

  return matched / queryTokens.size;
}

function calculateFreshness(createdAt: string, now: Date): number {
  const timestamp = Date.parse(createdAt);
  const nowTimestamp = now.getTime();

  if (!Number.isFinite(timestamp) || !Number.isFinite(nowTimestamp) || timestamp > nowTimestamp) {
    return 0;
  }

  const ageDays = Math.max(0, (nowTimestamp - timestamp) / DAY_MS);
  return 1 / (1 + ageDays / 365);
}

export function rerankSearchResults(
  query: string,
  results: SearchResult[],
  weights: RerankWeights,
  options: RerankOptions = {},
): SearchResult[] {
  if (results.length <= 1) {
    return [...results];
  }

  const queryTokens = new Set(tokenize(query));
  const now = options.now ?? new Date();
  const scoredResults: ScoredResult[] = results.map((result, index) => {
    const overlap = calculateOverlap(queryTokens, result);
    const similarity = clamp01(result.similarity);
    const freshness = calculateFreshness(result.document.created_at, now);

    return {
      result,
      index,
      score:
        overlap * weights.overlapWeight
        + similarity * weights.similarityWeight
        + freshness * weights.freshnessWeight,
    };
  });

  return scoredResults
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .map((item) => item.result);
}
