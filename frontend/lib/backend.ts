import type {
  AdminDocumentsResponse,
  AdminStats,
  ChatResponse,
  DeleteDocumentResponse,
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

export function ingestDocument(token: string, url: string) {
  return request<IngestResponse>("/ingest", token, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
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
