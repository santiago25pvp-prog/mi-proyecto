export interface ChatSource {
  name: string;
  content: string;
}

export interface ApiResponseMeta {
  requestId?: string;
}

export interface ChatResponse extends ApiResponseMeta {
  answer: string;
  sources: ChatSource[];
  code?: string;
  degraded?: boolean;
  retryable?: boolean;
  retryAfterMs?: number;
}

export interface BackendErrorMetadata {
  code: string | null;
  degraded: boolean;
  retryable: boolean;
  retryAfterMs: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export interface AdminDocument {
  id: number;
  name: string;
  content: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminDocumentsResponse extends ApiResponseMeta {
  data: AdminDocument[];
  count: number | null;
}

export interface AdminStats extends ApiResponseMeta {
  docCount: number | null;
  requestCount: number | null;
}

export interface IngestResponse extends ApiResponseMeta {
  status: "success" | "partial_success";
  chunks_inserted: number;
  chunks_failed: number;
}

export interface DeleteDocumentResponse extends ApiResponseMeta {
  message: string;
}

export interface SignUpResult {
  requiresEmailVerification: boolean;
}
