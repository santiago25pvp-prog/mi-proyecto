import type {
  AdminDocumentsResponse,
  AdminStats,
  ChatResponse,
  IngestResponse,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
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
  return request<{ message: string }>(`/admin/documents/${id}`, token, {
    method: "DELETE",
  });
}
