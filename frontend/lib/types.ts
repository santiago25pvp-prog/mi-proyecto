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

export interface ChatStreamTokenEvent extends ApiResponseMeta {
  delta: string;
}

export interface ChatStreamDoneEvent extends ChatResponse {
  timings?: {
    firstTokenMs?: number | null;
    totalMs?: number;
  };
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

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionMessage extends ChatMessage {
  sequence: number;
  createdAt: string;
}

export interface ChatSessionsResponse extends ApiResponseMeta {
  sessions: ChatSession[];
}

export interface CreateChatSessionResponse extends ApiResponseMeta {
  session: ChatSession;
}

export interface ChatSessionMessagesResponse extends ApiResponseMeta {
  messages: ChatSessionMessage[];
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

export type IngestJobStatus = "queued" | "running" | "failed" | "done";

export interface IngestResult {
  status: "success" | "partial_success";
  chunks_inserted: number;
  chunks_failed: number;
}

export interface IngestResponse extends ApiResponseMeta {
  jobId: string;
  status: IngestJobStatus;
}

export interface IngestJobStatusResponse extends ApiResponseMeta {
  jobId: string;
  status: IngestJobStatus;
  url: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: IngestResult;
  error?: string;
}

export interface DeleteDocumentResponse extends ApiResponseMeta {
  message: string;
}

export interface SignUpResult {
  requiresEmailVerification: boolean;
}
