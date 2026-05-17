# Phase 3 Rerank Evaluation Design

## Goal

Implement deterministic post-retrieval reranking and extend evaluation so the project can compare vector, hybrid, and hybrid-plus-rerank retrieval behavior without adding an LLM judge gate.

## Scope

- Add a feature-flagged rerank mode after the current vector/hybrid retrieval step.
- Keep the existing vector and hybrid retrieval paths as rollback options.
- Rank with deterministic heuristics only: keyword overlap, original retrieval score, and optional freshness.
- Extend evaluation reporting to compare configured retrieval variants in one command.
- Keep LLM judge out of Phase 3 implementation; it remains a future report-only extension.

## Architecture

The Supabase adapter remains responsible for fetching candidates through `match_documents` or `match_documents_hybrid`. A new reranking service reorders those candidates in application code, preserving the same `SearchResult[]` contract for downstream RAG generation.

Configuration stays environment-driven beside existing retrieval flags. Evaluation runs variants sequentially by temporarily applying environment overrides, measuring deterministic metrics per variant, and restoring the original environment afterward.

## Configuration

- `RAG_RERANK_ENABLED`: enables reranking when set to `true`, `1`, or `yes`.
- `RAG_RERANK_OVERLAP_WEIGHT`: keyword overlap weight, default `0.5`.
- `RAG_RERANK_SIMILARITY_WEIGHT`: original retrieval score weight, default `0.4`.
- `RAG_RERANK_FRESHNESS_WEIGHT`: freshness weight, default `0.1`.
- `RAG_EVAL_COMPARE_MODES`: comma-separated variants for `rag:eval`, default `current`.

Weights are normalized when valid. Invalid values fall back to safe defaults.

## Ranking Behavior

For each result:

- Normalize query and document text to lowercase ASCII-like tokens.
- Compute overlap as the ratio of unique query tokens present in document name/content.
- Normalize similarity defensively to `0..1`.
- Compute freshness from `created_at`; invalid dates receive `0`.
- Calculate final score as weighted overlap + similarity + freshness.
- Preserve original order as a stable tie-breaker.

## Evaluation Behavior

`npm run rag:eval` keeps its current single-lane behavior by default. When `RAG_EVAL_COMPARE_MODES` includes multiple variants, the script prints a per-variant summary for:

- `vector`
- `hybrid`
- `hybrid-rerank`
- `current`

The command remains a live non-blocking signal and exits non-zero only when the best configured report lane fails its minimum pass-rate threshold.

## Testing

- Unit tests cover rerank scoring, stable ordering, config parsing, and disabled behavior.
- Evaluation tests cover variant parsing and environment restoration without live network calls.
- Existing adapter tests cover applying rerank after hybrid/vector retrieval.

## Documentation

README documents Phase 3 flags, default behavior, and evaluation comparison usage.
