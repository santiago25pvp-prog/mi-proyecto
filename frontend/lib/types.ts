export interface ChatSource {
  name: string;
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
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

export interface AdminDocumentsResponse {
  data: AdminDocument[];
  count: number | null;
}

export interface AdminStats {
  docCount: number | null;
  requestCount: number | null;
}

export interface SignUpResult {
  requiresEmailVerification: boolean;
}

