import type {
  AdminDocumentsResponse,
  AdminStats,
  ChatResponse,
  ChatStreamDoneEvent,
  ChatStreamTokenEvent,
  DeleteDocumentResponse,
  IngestJobStatusResponse,
  IngestResponse,
} from "@/lib/types";
import type { BackendErrorMetadata } from "@/lib/types";
import { readFrontendPublicEnv, resolveApiUrl } from "./env";

const API_URL = resolveApiUrl(readFrontendPublicEnv());

type ErrorPayload = {
  error?: unknown;
  requestId?: unknown;
  code?: unknown;
  degraded?: unknown;
  retryable?: unknown;
  retryAfterMs?: unknown;
};

export class BackendApiError extends Error {
  requestId: string | null;
  status: number;
  metadata: BackendErrorMetadata;

  constructor(
    message: string,
    status: number,
    requestId: string | null = null,
    metadata: BackendErrorMetadata = {
      code: null,
      degraded: false,
      retryable: false,
      retryAfterMs: null,
    },
  ) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.requestId = requestId;
    this.metadata = metadata;
  }
}

export class SseUnavailableError extends Error {
  constructor(message = "SSE not available") {
    super(message);
    this.name = "SseUnavailableError";
  }
}

export type BackendErrorInfo = {
  message: string;
  requestId: string | null;
  metadata: BackendErrorMetadata;
};

export function getBackendErrorInfo(
  error: unknown,
  fallbackMessage: string,
): BackendErrorInfo {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const requestId =
    error instanceof BackendApiError && error.requestId ? error.requestId : null;
  const metadata =
    error instanceof BackendApiError
      ? error.metadata
      : {
          code: null,
          degraded: false,
          retryable: false,
          retryAfterMs: null,
        };

  return { message, requestId, metadata };
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const payloadObject =
      typeof payload === "object" && payload !== null ? (payload as ErrorPayload) : null;
    const message =
      payloadObject && typeof payloadObject.error === "string"
        ? payloadObject.error
        : `Request failed with status ${response.status}`;
    const requestId =
      payloadObject && typeof payloadObject.requestId === "string"
        ? payloadObject.requestId
        : null;
    const metadata: BackendErrorMetadata = {
      code: payloadObject && typeof payloadObject.code === "string" ? payloadObject.code : null,
      degraded: payloadObject?.degraded === true,
      retryable: payloadObject?.retryable === true,
      retryAfterMs:
        payloadObject && typeof payloadObject.retryAfterMs === "number"
          ? payloadObject.retryAfterMs
          : null,
    };

    throw new BackendApiError(message, response.status, requestId, metadata);
  }

  return payload as T;
}

export function sendChatMessage(token: string, query: string) {
  return request<ChatResponse>("/query", token, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

type StreamCallbacks = {
  onToken: (event: ChatStreamTokenEvent) => void;
  onDone: (event: ChatStreamDoneEvent) => void;
  onError?: (error: BackendApiError) => void;
};

function parseTokenEvent(payload: Record<string, unknown>): ChatStreamTokenEvent | null {
  if (typeof payload.delta !== "string") {
    return null;
  }

  return {
    delta: payload.delta,
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
  };
}

function parseDoneEvent(payload: Record<string, unknown>): ChatStreamDoneEvent | null {
  if (typeof payload.answer !== "string" || !Array.isArray(payload.sources)) {
    return null;
  }

  return {
    answer: payload.answer,
    sources: payload.sources as ChatStreamDoneEvent["sources"],
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
    code: typeof payload.code === "string" ? payload.code : undefined,
    degraded: payload.degraded === true,
    retryable: payload.retryable === true,
    retryAfterMs: typeof payload.retryAfterMs === "number" ? payload.retryAfterMs : undefined,
    timings:
      payload.timings && typeof payload.timings === "object"
        ? {
            firstTokenMs:
              typeof (payload.timings as { firstTokenMs?: unknown }).firstTokenMs === "number"
                ? (payload.timings as { firstTokenMs: number }).firstTokenMs
                : null,
            totalMs:
              typeof (payload.timings as { totalMs?: unknown }).totalMs === "number"
                ? (payload.timings as { totalMs: number }).totalMs
                : undefined,
          }
        : undefined,
  };
}

function parseSseEvents(chunk: string, carry: string) {
  const merged = `${carry}${chunk}`;
  const parts = merged.split("\n\n");
  const rest = parts.pop() ?? "";

  const events = parts
    .map((part) => {
      const lines = part.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:"));
      const dataLine = lines.find((line) => line.startsWith("data:"));

      if (!eventLine || !dataLine) {
        return null;
      }

      return {
        event: eventLine.replace(/^event:\s*/, "").trim(),
        data: dataLine.replace(/^data:\s*/, "").trim(),
      };
    })
    .filter((value): value is { event: string; data: string } => value !== null);

  return { events, rest };
}

export async function streamChatMessage(
  token: string,
  query: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_URL}/query/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    const raw = await response.text();
    let payload: ErrorPayload | null = null;

    try {
      payload = raw ? (JSON.parse(raw) as ErrorPayload) : null;
    } catch {
      payload = null;
    }

    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;

    throw new BackendApiError(
      message,
      response.status,
      payload && typeof payload.requestId === "string" ? payload.requestId : null,
      {
        code: payload && typeof payload.code === "string" ? payload.code : null,
        degraded: payload?.degraded === true,
        retryable: payload?.retryable === true,
        retryAfterMs:
          payload && typeof payload.retryAfterMs === "number" ? payload.retryAfterMs : null,
      },
    );
  }

  if (!response.body) {
    throw new SseUnavailableError();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseEvents("", buffer);
    buffer = rest;

    for (const entry of events) {
      try {
        const payload = JSON.parse(entry.data) as Record<string, unknown>;

        if (entry.event === "token") {
          const tokenEvent = parseTokenEvent(payload);

          if (!tokenEvent) {
            throw new SseUnavailableError("Malformed token event payload");
          }

          callbacks.onToken(tokenEvent);
          continue;
        }

        if (entry.event === "done") {
          const doneEvent = parseDoneEvent(payload);

          if (!doneEvent) {
            throw new SseUnavailableError("Malformed done event payload");
          }

          callbacks.onDone(doneEvent);
          return;
        }

        if (entry.event === "error") {
          const backendError = new BackendApiError(
            typeof payload.error === "string" ? payload.error : "Streaming failed",
            typeof payload.status === "number" ? payload.status : 500,
            typeof payload.requestId === "string" ? payload.requestId : null,
            {
              code: typeof payload.code === "string" ? payload.code : null,
              degraded: payload.degraded === true,
              retryable: payload.retryable === true,
              retryAfterMs: typeof payload.retryAfterMs === "number" ? payload.retryAfterMs : null,
            },
          );

          callbacks.onError?.(backendError);
          throw backendError;
        }
      } catch (error) {
        if (error instanceof BackendApiError) {
          throw error;
        }

        throw new SseUnavailableError("Malformed SSE payload");
      }
    }
  }

  throw new SseUnavailableError("Stream closed without done event");
}

export function ingestDocument(token: string, url: string) {
  return request<IngestResponse>("/ingest", token, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function fetchIngestJobStatus(token: string, jobId: string) {
  return request<IngestJobStatusResponse>(`/ingest/${encodeURIComponent(jobId)}`, token);
}

export function fetchAdminStats(token: string) {
  return request<AdminStats>("/admin/stats", token);
}

export function fetchDocuments(token: string) {
  return request<AdminDocumentsResponse>("/admin/documents", token);
}

export function deleteDocument(token: string, id: number) {
  return request<DeleteDocumentResponse>(`/admin/documents/${id}`, token, {
    method: "DELETE",
  });
}
