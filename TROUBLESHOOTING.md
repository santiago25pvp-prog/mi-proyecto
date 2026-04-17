# Troubleshooting Guide

This guide covers common failures in ingestion, embeddings, retrieval, frontend integration, and deployment health checks.

## 1) Ingestion Issues

### Symptom: Request timeouts during ingestion

- Verify the target URL is reachable from the backend host (no VPN/firewall blocks).
- Retry with a smaller page or a page with fewer redirects to isolate remote latency.
- Check backend logs for scraper timeout or payload limit warnings.
- If the source is consistently slow, split ingestion by URL section and process incrementally.

### Symptom: Extraction failed or empty content

- Confirm the page returns server-side HTML (not JS-only rendered content).
- Validate the URL responds with `200 OK` and expected HTML in a browser or curl.
- Check for anti-bot protections or required authentication on the source website.
- Re-run ingestion with a known-good documentation URL to verify pipeline health.

## 2) Embedding Issues

### Symptom: `429` / rate limit from embedding provider

- Reduce ingestion batch size and retry with fewer chunks per request.
- Add delay between retries and avoid parallel embedding jobs.
- Confirm the API key quota and rate limits in your provider dashboard.
- Run ingestion again after cooldown if quota was temporarily exceeded.

### Symptom: Dimension mismatch (vector length errors)

- Ensure embedding model output dimensions match DB schema (`vector(3072)`).
- Confirm the active model is `gemini-embedding-001` (or update schema/migrations accordingly).
- Verify no stale migration changed `documents.embedding` to a different size.
- Reconcile schema drift before re-ingesting data.

## 3) Retrieval Issues

### Symptom: No results returned

- Confirm documents were ingested successfully (`chunks_inserted > 0`).
- Verify `match_documents` function exists and points to the correct table/column.
- Check that embeddings were stored for the ingested chunks (not null/empty vectors).
- Try a broader query to rule out overly specific wording.

### Symptom: Low relevance in returned sources

- Re-ingest source pages with cleaner, less noisy input content.
- Adjust chunking strategy if documents contain large mixed topics.
- Validate query phrasing and use domain-specific terms used in the source material.
- Run `npm run rag:eval` to measure retrieval hit rate and keyword coverage.

## 3.1) RAG Reliability Incidents

### Symptom: `/query` returns `503` with degraded metadata

- Confirm payload includes `code=UPSTREAM_TEMPORARY_UNAVAILABLE`, `degraded=true`, `retryable=true` and `retryAfterMs`.
- Correlate request with `requestId` and inspect reliability events: `rag_provider_retry`, `rag_provider_retry_exhausted`, `rag_query_degraded_response`.
- If outage is transient, keep fallback disabled by default and retry after `retryAfterMs`.
- If degraded rate remains high, follow runbook escalation in `docs/runbooks/rag-reliability.md`.

### Symptom: Terminal provider errors should not look degraded

- Check responses for `degraded=false` and `retryable=false`.
- Validate provider credentials/model configuration before changing retry policy flags.
- Ensure `RAG_FALLBACK_ON_TRANSIENT_ENABLED` is not masking terminal conditions.

## 4) Frontend Issues

### Symptom: Frontend cannot connect to backend

- Validate `NEXT_PUBLIC_API_URL` points to a reachable backend URL.
- Confirm backend is running and healthy at `/health`.
- Check browser devtools network tab for CORS, DNS, or TLS errors.
- In production, ensure `ALLOWED_ORIGIN` matches the frontend origin.

### Symptom: E2E failures in smoke flow

- Run `npm run test:e2e` from `frontend` and inspect Playwright error traces.
- Confirm test env vars are set (`NEXT_PUBLIC_*`) and no local overrides break config.
- Ensure required browser dependency (Chromium) is installed for Playwright.
- Re-run with a clean state when prior test artifacts or sessions cause flakiness.

## 5) Deployment / Health Issues

### Symptom: Supabase credential errors

- Verify backend env vars: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Verify frontend env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Check for accidental whitespace, truncated keys, or wrong project reference.
- Rotate keys if they were leaked or revoked, then redeploy.

### Symptom: Health check reports dependency failure

- Call `GET /health` and inspect dependency status in the response.
- Validate network access from backend runtime to Supabase endpoints.
- Confirm database migrations were applied and required SQL functions exist.
- Review backend logs around startup and first request for initialization failures.

## Quick Verification Checklist

- Backend typecheck/tests/audit pass in root project.
- Frontend typecheck/tests/build/audit pass in `frontend`.
- E2E smoke passes with Playwright.
- `npm run rag:eval` completes or has documented external-service failure evidence.
- `npm run rag:eval:deterministic` passes locally (no external dependencies).
