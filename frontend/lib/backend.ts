import type {
  AdminDocumentsResponse,
  AdminStats,
  ChatResponse,
  DeleteDocumentResponse,
  IngestResponse,
} from "@/lib/types";
import { resolveApiUrl } from "@/lib/env";

const API_URL = resolveApiUrl();

type ErrorPayload = {
  error?: unknown;
  requestId?: unknown;
};

export class BackendApiError extends Error {
  requestId: string | null;
  status: number;

  constructor(message: string, status: number, requestId: string | null = null) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

export type BackendErrorInfo = {
  message: string;
  requestId: string | null;
};

export function getBackendErrorInfo(
  error: unknown,
  fallbackMessage: string,
): BackendErrorInfo {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const requestId =
    error instanceof BackendApiError && error.requestId ? error.requestId : null;

  return { message, requestId };
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

    throw new BackendApiError(message, response.status, requestId);
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
