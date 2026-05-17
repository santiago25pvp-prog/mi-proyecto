# Phase 3 Rerank Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic post-retrieval reranking and comparison evaluation for vector, hybrid, and hybrid-plus-rerank modes.

**Architecture:** Retrieval continues to use the existing vector store interface. A new service applies deterministic reranking to `SearchResult[]` after Supabase RPC retrieval, gated by environment config. The evaluation script can run several environment variants sequentially and print comparable summaries.

**Tech Stack:** Node.js, TypeScript, `node:test`, Supabase RPC via `@supabase/supabase-js`.

---

### Task 1: Rerank Configuration

**Files:**
- Modify: `services/retrieval-config.ts`
- Test: `tests/retrieval-config.test.ts`

- [ ] Write failing tests for disabled defaults, enabled parsing, invalid boolean fallback, and normalized rerank weights.
- [ ] Run `node --test --require ts-node/register tests/retrieval-config.test.ts` and confirm the new tests fail because rerank config is missing.
- [ ] Add rerank config parsing to `getRetrievalConfig`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Deterministic Reranker

**Files:**
- Create: `services/retrieval-rerank.ts`
- Test: `tests/retrieval-rerank.test.ts`

- [ ] Write failing tests for keyword overlap promotion, similarity preservation, invalid freshness handling, and stable tie ordering.
- [ ] Run `node --test --require ts-node/register tests/retrieval-rerank.test.ts` and confirm it fails because the service does not exist.
- [ ] Implement tokenization, scoring, and stable sort.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Adapter Integration

**Files:**
- Modify: `services/supabase-vector-adapter.ts`
- Test: `tests/supabase-vector-adapter.test.ts`

- [ ] Write a failing test proving rerank is applied after hybrid/vector candidates are fetched.
- [ ] Run `node --test --require ts-node/register tests/supabase-vector-adapter.test.ts` and confirm the new test fails.
- [ ] Call the reranker when `RAG_RERANK_ENABLED` is enabled.
- [ ] Re-run the focused test and confirm it passes.

### Task 4: Evaluation Comparison

**Files:**
- Modify: `scripts/eval-rag.ts`
- Test: `tests/rag-eval.test.ts`

- [ ] Extract pure parsing/report helpers from the eval script and write failing tests for mode parsing and environment restoration.
- [ ] Run `node --test --require ts-node/register tests/rag-eval.test.ts` and confirm it fails.
- [ ] Implement variant execution helpers and preserve current default behavior.
- [ ] Re-run the focused test and confirm it passes.

### Task 5: Documentation And Final Checks

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] Add new test files to `npm run test` and `npm run test:backend`.
- [ ] Document Phase 3 flags and comparison mode.
- [ ] Run focused tests touched in this phase.
- [ ] Run required pre-commit checks: root `npx tsc --noEmit` and `frontend` `npx tsc --noEmit`.
- [ ] Run `git add .` and commit using conventional commit format.
