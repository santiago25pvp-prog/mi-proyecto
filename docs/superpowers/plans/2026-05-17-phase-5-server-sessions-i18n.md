# Phase 5 Server Sessions + Minimal i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist chat conversations per user in Supabase and localize public backend errors through `Accept-Language`.

**Architecture:** Add Supabase tables for sessions/messages, a backend service for user-scoped CRUD, protected Express routes for session management, and optional query persistence through `sessionId`. Frontend loads server sessions and keeps local storage only as fallback.

**Tech Stack:** Node.js, Express, TypeScript, Supabase/Postgres, Next.js, React, node:test.

---

### Task 1: Database Schema

**Files:**
- Create: `migrations/004_chat_sessions.sql`

- [x] Add `chat_sessions` and `chat_messages` tables with RLS policies scoped by `auth.uid()`.
- [x] Add indexes for user/session lookup.
- [x] Add an `updated_at` trigger for sessions.

### Task 2: Backend Session Service

**Files:**
- Create: `services/chat-sessions.ts`
- Test: `tests/chat-sessions.test.ts`

- [x] Write failing tests for listing, creating, loading messages, deleting, and appending exchanges.
- [x] Implement Supabase-backed service functions with explicit `user_id` filters.
- [x] Verify service tests pass in-process.

### Task 3: Session Routes

**Files:**
- Create: `controllers/chat-sessions.ts`
- Create: `routes/chat-sessions.ts`
- Modify: `server.ts`
- Test: `tests/chat-sessions-routes.test.ts`

- [x] Write failing route tests for auth-protected session CRUD.
- [x] Wire routes under `/chat/sessions`.
- [x] Verify route tests pass in-process.

### Task 4: Query Persistence

**Files:**
- Modify: `controllers/api.ts`
- Modify: `server.ts`
- Test: `tests/api-routes.test.ts`

- [x] Write failing tests for `/query` and `/query/stream` with `sessionId`.
- [x] Validate ownership before generation.
- [x] Persist user and assistant messages after successful responses.

### Task 5: Minimal i18n

**Files:**
- Create: `services/i18n.ts`
- Modify: `middleware/authMiddleware.ts`
- Modify: `middleware/adminMiddleware.ts`
- Modify: `middleware/errorMiddleware.ts`
- Modify: `middleware/rateLimiter.ts`
- Test: `tests/i18n.test.ts`

- [x] Write failing tests for `Accept-Language: es` and `Accept-Language: en`.
- [x] Implement translation helper with legacy fallback when no supported language is requested.
- [x] Localize public errors without changing existing no-header behavior.

### Task 6: Frontend Client and Chat UI

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/backend.ts`
- Modify: `frontend/components/chat/chat-shell.tsx`
- Test: `frontend/tests/backend.test.ts`

- [x] Write failing frontend backend-client tests for session endpoints and `Accept-Language`.
- [x] Add session API helpers and `sessionId` support for query calls.
- [x] Update `ChatShell` to load sessions, switch sessions, and create a session on first prompt.

### Task 7: Docs and Verification

**Files:**
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `package.json`
- Modify: `frontend/package.json` if new tests are added

- [x] Document session endpoints and i18n behavior.
- [x] Run focused backend and frontend tests.
- [x] Run `npx tsc --noEmit` in root.
- [x] Run `npx tsc --noEmit` in `frontend`.
- [ ] Commit with conventional commit and open a PR from `develop` to `main`.
