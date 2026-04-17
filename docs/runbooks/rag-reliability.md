# RAG Reliability Runbook

## Purpose

Operational guide for transient provider outages and degraded `/query` responses.

## Signals and Severity Thresholds

- Warning and critical are the only valid severities.
- Phase A source of truth is log-derived SLI evaluation.
- Availability warning: `< 99.5%` (critical when `< 99.0%`).
- Degraded response warning: `> 2.0%` (critical when `> 4.0%`).
- Retry exhaustion warning: `> 0.5%` (critical when `> 1.0%`).
- Latency warning: `p95 > 3300ms` (critical when `p95 > 4000ms`).

## Triage Flow

1. Confirm if failures are transient provider vs internal:
   - Transient pattern: `code=UPSTREAM_TEMPORARY_UNAVAILABLE`, `degraded=true`, `retryable=true`.
   - Terminal/internal pattern: `degraded=false` or generic `500` without degraded code.
2. Filter logs by `requestId` and canonical event keys:
   - `rag_provider_retry`
   - `rag_provider_retry_exhausted`
   - `rag_query_degraded_response`
   - `rag_query_fallback_served`
   - `rag_query_terminal_error`
3. Verify retry envelope remained bounded:
   - max attempts = 3
   - retry window <= 2000ms
   - retry delay cap <= 1200ms

## Immediate Mitigations

1. Disable fallback first (if enabled):
   - `RAG_FALLBACK_ON_TRANSIENT_ENABLED=false`
2. If degraded contract affects clients unexpectedly:
   - `RAG_DEGRADED_CONTRACT_ENABLED=false`
3. If latency regression breaches tolerance:
   - `RAG_RELIABILITY_RETRY_ENABLED=false`

## Escalation Criteria

- Escalate to provider support when degraded critical threshold persists for > 15 minutes.
- Escalate internally to on-call backend owner when terminal errors increase with degraded disabled.
- Include sampled `requestId`s, event counts, and timeline in escalation message.

## Ownership and Correlation

- Ownership definitions live in `docs/observability/ownership-matrix.md`.
- Alert rules without ownership metadata, runbook links, or correlation references are invalid and must not be promoted.

## Evidence Checklist (Post-Incident)

- Request IDs demonstrating incident windows.
- Event counts for retries/exhaustion/degraded/fallback/terminal.
- SLI snapshots:
  - retry attempt distribution
  - degraded response rate
  - transient provider error rate
  - fallback rate
  - p95 latency split by normal/degraded
- Confirm rollback switches and final steady-state flag values.
