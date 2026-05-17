# Phase 4 Async Ingestion Plan

## Steps

1. Add focused tests for the ingestion job queue.
2. Update API route tests for `POST /ingest` returning `202` and `GET /ingest/:jobId` returning status.
3. Implement an in-memory queue service with retries and active URL reuse.
4. Wire Express routes to enqueue and inspect jobs.
5. Update frontend API types and the admin panel to display `jobId` and refresh status.
6. Update public docs for the new ingestion contract.
7. Verify with focused backend/frontend tests and required TypeScript checks.

## Acceptance Criteria

- Long ingestions no longer block the `POST /ingest` HTTP response.
- Status is visible through a protected endpoint.
- Transient failures retry before becoming terminal failures.
- TypeScript checks pass in backend and frontend before commit.
