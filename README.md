# mi-proyecto

`mi-proyecto` is a RAG (Retrieval-Augmented Generation) system that turns web content into a searchable knowledge base. It solves the problem of having documentation, manuals, or pages scattered across the web and needing traceable answers through an API and an authenticated web interface, with vector storage in Supabase and answer generation with Gemini.

## Main Features

### RAG Architecture

- Ingests a URL, cleans the HTML, and extracts only useful text.
- Splits content into 1000-character chunks with 200 overlap.
- Generates embeddings with `gemini-embedding-001` at `3072` dimensions.
- Stores content, metadata, and embeddings in Supabase using `pgvector`.
- Retrieves relevant documents through the SQL function `match_documents`.
- Generates the final answer with `gemini-2.5-flash` using retrieved context.

### Unified API

- `POST /query` receives `query` and returns JSON in this format: `{ "requestId": string, "answer": string, "sources": [] }`.
- `POST /ingest` exposes the document ingestion pipeline and reports successful and failed insertions.
- Administrative endpoints allow listing documents, deleting documents, and checking stats.

### Authentication and Authorization

- The API uses Supabase JWT in the `Authorization: Bearer <token>` header.
- `authMiddleware` validates the token against Supabase before allowing access to protected routes.
- `adminMiddleware` restricts `/admin/*` to users with `app_metadata.role === "admin"`.
- The frontend uses Supabase Auth for login, registration, and session handling.

### Tests

- The backend full suite runs with `node:test` and includes:
  `tests/admin-auth.test.ts`, `tests/api-routes.test.ts`, `tests/ai.test.ts`, `tests/rag.test.ts`, `tests/retrieval.test.ts`, `tests/embedding.test.ts`, and `tests/splitter.test.ts`.
- Backend coverage includes authentication, authorization, rate limiting, API route contracts, AI/RAG orchestration, retrieval behavior, embedding generation, and splitter logic.
- The frontend test suite currently includes helper and API/env behavior tests in:
  `frontend/tests/chat-storage.test.ts`, `frontend/tests/auth-session.test.ts`, `frontend/tests/chat-messages.test.ts`, `frontend/tests/backend.test.ts`, and `frontend/tests/env.test.ts`.
- The GitHub Actions workflow runs quality and build checks on pull requests to `main` and `develop`.

### Quality Gates

- Backend:
  - `npx tsc --noEmit`
  - `npm run test:backend`
- Frontend (inside `frontend`):
  - `npx tsc --noEmit`
  - `npm test`
  - `npm run test:e2e`

### RAG Evaluation (Metrics-Based)

- Run the evaluation harness with the bundled sample dataset:

```bash
npm run rag:eval
```

- Use a custom dataset file:

```bash
npm run rag:eval -- --dataset=eval/fixtures/rag-eval.sample.json
```

- Optional env overrides:
  - `RAG_EVAL_DATASET`: dataset path (same behavior as `--dataset`).
  - `RAG_EVAL_MIN_PASS_RATE`: overall pass-rate threshold from `0` to `1`.

- Per-case heuristic checks:
  - `keyword coverage`: matched `expectedKeywords` in the answer divided by total expected keywords.
  - `sources count`: number of returned sources against `minimumSources`.
  - Case passes only if both thresholds pass.

- Summary metrics:
  - `total cases`, `passed`, `pass rate`, `retrieval hit rate` (cases with at least one source), and `average keyword coverage`.
  - The script exits with non-zero status when overall pass rate is below the configured threshold.

### Operations and Robustness

- `server.ts` validates environment variables on startup and exposes a healthcheck with dependency verification.
- The backend uses structured logging with Winston and currently adds request IDs in the `ingest` and `query` API handlers.
- The scraper has timeout, redirect limits, and payload size limits to prevent trivial DoS cases.
- The frontend chat persists transcript and active selection per user in `localStorage`.
- Frontend authentication refreshes the session when the token is close to expiration.

## Installation

### 1. Select Node Version

This repo uses the version defined in `.nvmrc`.

```bash
nvm use
```

### 2. Configure Environment Variables

Create the `.env` file in the project root:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
GEMINI_API_KEY=tu_gemini_api_key
SUPABASE_ANON_KEY=tu_supabase_anon_key
PORT=3001
```

Notes:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` are required for the backend.
- `SUPABASE_ANON_KEY` is not listed in `.env.example`, but it is useful for auth scripts in `scripts/get-token.ts`.
- `PORT` is optional; by default the backend listens on `3001`.
- In `production`, `ALLOWED_ORIGIN` is required and backend startup fails if it is missing.

Create the `frontend/.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Frontend notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required to initialize Supabase in the browser.
- `NEXT_PUBLIC_API_URL` falls back to `http://localhost:3001` only outside `production`.
- In `production`, `NEXT_PUBLIC_API_URL` is required and frontend config resolution fails if it is missing.
- In `NODE_ENV=test` (E2E smoke), frontend uses deterministic Supabase fallback values so startup does not fail due to missing env vars.

### 3. Install Dependencies

Install backend dependencies in the root:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

### 4. Run Locally

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Default ports:

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

## Repository Structure

```text
.
|-- controllers/
|-- middleware/
|-- migrations/
|-- routes/
|-- services/
|-- scripts/
|-- tests/
|-- frontend/
|-- server.ts
|-- package.json
|-- CHANGELOG.md
```

- `controllers/`
  Contains backend HTTP handlers.
  - `api.ts`: exposes `/ingest` and `/query`.
  - `admin.ts`: exposes administrative operations for documents and stats.

- `services/`
  Implements RAG and admin domain logic.
  - `scraper.ts`: downloads and cleans HTML.
  - `splitter.ts`: splits text into chunks.
  - `embedding.ts`: creates Gemini embeddings, with LRU cache and batch support for ingestion.
  - `retrieval.ts`: executes vector search in Supabase.
  - `ingestion.ts`: orchestrates scraping, splitting, embeddings, and insertions.
  - `vector-db.ts`: creates backend Supabase client.
  - `adminService.ts`: lists, deletes, and summarizes documents.

- `migrations/`
  Contains vector database definition.
  - `001_init_rag.sql`: creates `vector` extension and `documents` table.
  - `002_reconcile_document_embeddings.sql`: normalizes embeddings to `vector(3072)` and creates the `match_documents` function.

- `frontend/`
  Next.js app that consumes the API and Supabase Auth.
  - `app/`: `chat`, `admin`, `login`, and `register` pages.
  - `components/`: UI, auth, chat, admin, and providers.
  - `lib/backend.ts`: fetch client for backend API.
  - `lib/supabase-browser.ts`: browser Supabase client.
  - `lib/chat-storage.ts` and `lib/auth-session.ts`: local chat persistence and session refresh.
  - `tests/`: helper and API/env behavior tests.

- `middleware/`
  Authentication, admin authorization, and rate limiting middleware.

- `routes/`
  Express router for the admin area.

- `tests/`
  Backend test suite focused on auth, admin, JSON contracts, healthcheck, AI/RAG, retrieval, embeddings, and splitter behavior.

- `scripts/`
  Support utilities for admin, auth, and manual RAG flow testing.

## API Reference

### General Conventions

- Local backend base URL: `http://localhost:3001`
- Expected content type for requests with body: `application/json`
- Protected auth header: `Authorization: Bearer <supabase_jwt>`
- Auth error responses:

```json
{ "error": "Unauthorized: Missing or invalid token" }
```

```json
{ "error": "Unauthorized: Invalid token" }
```

- Admin error response:

```json
{ "error": "Forbidden: Admins only" }
```

- Rate limits use plain text messages, not JSON:
  - Public: `Demasiadas solicitudes, intenta de nuevo mas tarde.`
  - Authenticated: `Demasiadas solicitudes autenticadas, intenta de nuevo mas tarde.`

### GET /health

- Method: `GET`
- Auth: not required
- Query params: none
- Body: none
- `200 OK` response:

```json
{ "status": "ok", "dependencies": { "supabase": "ok" } }
```

### POST /query

- Method: `POST`
- Auth: required
- JSON body:

```json
{ "query": "consulta" }
```

- Parameters:
  - `query` (string, required): query that will be answered with RAG.
- `200 OK` response:

```json
{
  "answer": "Respuesta consolidada",
  "sources": [
    {
      "name": "Manual",
      "content": "Contenido"
    }
  ]
}
```

- `400 Bad Request` response:

```json
{ "error": "Query is required" }
```

- `500 Internal Server Error` response:

```json
{ "error": "Failed to process query" }
```

### POST /ingest

- Method: `POST`
- Auth: required
- JSON body:

```json
{ "url": "https://example.com/docs" }
```

- Parameters:
  - `url` (string, required): URL to scrape and index.
- `200 OK` response when full ingestion succeeds:

```json
{
  "status": "success",
  "chunks_inserted": 2,
  "chunks_failed": 0
}
```

- `200 OK` response when ingestion is partial:

```json
{
  "status": "partial_success",
  "chunks_inserted": 1,
  "chunks_failed": 1
}
```

- `400 Bad Request` response:

```json
{ "error": "URL is required" }
```

- `500 Internal Server Error` response:

```json
{ "error": "Failed to ingest URL" }
```

### GET /admin/documents

- Method: `GET`
- Auth: required
- Admin role: required
- Query params:
  - `page` (number, optional, default `1`)
  - `pageSize` (number, optional, default `10`)
- Body: none
- `200 OK` response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Manual de prueba",
      "content": "Contenido indexado",
      "created_at": "2026-04-07T00:00:00.000Z",
      "metadata": {
        "url": "https://example.com"
      }
    }
  ],
  "count": 1
}
```

- `500 Internal Server Error` response:

```json
{ "error": "Failed to list documents" }
```

### DELETE /admin/documents/:id

- Method: `DELETE`
- Auth: required
- Admin role: required
- Path params:
  - `id` (number, required): document identifier in the `documents` table.
- Body: none
- `200 OK` response:

```json
{
  "message": "Document deleted successfully",
  "requestId": "req_1234567890"
}
```

- `500 Internal Server Error` response:

```json
{ "error": "Failed to delete document" }
```

### GET /admin/stats

- Method: `GET`
- Auth: required
- Admin role: required
- Query params: none
- Body: none
- `200 OK` response:

```json
{
  "docCount": 42,
  "requestCount": 0
}
```

- `500 Internal Server Error` response:

```json
{ "error": "Internal Server Error", "requestId": "req_1234567890" }
```

## Changelog

Project version and release history is in [`CHANGELOG.md`](./CHANGELOG.md).
