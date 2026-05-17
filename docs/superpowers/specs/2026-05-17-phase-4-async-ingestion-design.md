# Phase 4 Async Ingestion Design

## Scope

Move document ingestion off the HTTP request path while preserving the existing scraping, chunking, embedding, and insert pipeline.

## Contract

- `POST /ingest` validates the URL, creates or reuses an active job, and returns `202 Accepted`.
- Response shape: `{ requestId, jobId, status }`.
- `GET /ingest/:jobId` returns job status and execution metadata.
- Job states: `queued`, `running`, `done`, `failed`.

## Implementation

- Use an in-memory queue for this phase.
- Reuse the active job for the same normalized URL while it is `queued` or `running`.
- Run the existing `ingestUrl(...)` function inside the worker.
- Retry transient failures up to 3 attempts.
- Treat validation/terminal errors such as `400`, `404`, and invalid URL as non-retryable.
- Log queued, started, retry scheduled, completed, and failed job events.

## Non-Goals

- No Supabase job persistence yet.
- No distributed worker coordination yet.
- No build step as part of this implementation.

## Follow-Up

If ingestion volume grows or multiple backend instances are deployed, move job metadata and locking into Supabase or a proper queue before relying on this for production durability.
