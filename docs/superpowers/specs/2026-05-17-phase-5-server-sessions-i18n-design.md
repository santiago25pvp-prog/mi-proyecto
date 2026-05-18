# Phase 5 Server Sessions + Minimal i18n Design

## Scope

Persist chat conversations in Supabase per authenticated user and add basic backend public-error localization through `Accept-Language`.

## Conversation Persistence

- Add `chat_sessions` and `chat_messages` tables.
- Keep all session access user-scoped by `user_id`.
- Enable RLS and policies so authenticated users can only access their own rows if tables are exposed through Supabase APIs.
- Keep backend access through the existing service-role Supabase client, but still filter by authenticated user ID in application code.
- Add protected REST routes:
  - `GET /chat/sessions`
  - `POST /chat/sessions`
  - `GET /chat/sessions/:sessionId/messages`
  - `DELETE /chat/sessions/:sessionId`
- Extend `POST /query` and `POST /query/stream` with optional `sessionId`.
- If `sessionId` is present, verify ownership before generating the response and persist the user/assistant exchange after a successful response.

## Frontend Flow

- Load server sessions after auth is available.
- Let the chat use the newest session by default.
- Create a server session on first prompt when none is active.
- Keep `sessionStorage` as a fallback cache, not the primary persistence source.
- Show a compact conversation list in the chat inspector so users can switch sessions.

## Minimal i18n

- Support `es` and `en` from the `Accept-Language` header.
- Preserve legacy fallback messages when no supported language is requested.
- Localize public backend errors for auth, rate limit, not found, validation summary, internal errors, degraded/provider errors, and chat session not found.
- Frontend backend client sends `Accept-Language: es-CO`.

## Non-Goals

- No realtime sync.
- No message editing or branching.
- No server-side rendering changes.
- No translating AI-generated content or static frontend UI copy.
