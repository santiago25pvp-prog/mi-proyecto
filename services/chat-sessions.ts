export type ChatSource = {
  name: string;
  content: string;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatSessionMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  sequence: number;
  createdAt: string;
};

type ChatSessionRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: unknown;
  sequence: number;
  created_at: string;
};

export type ChatSessionMessageInsert = {
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  sequence: number;
};

export type ChatSessionStore = {
  listSessions(userId: string): Promise<ChatSessionRow[]>;
  createSession(input: { userId: string; title: string }): Promise<ChatSessionRow>;
  getSession(userId: string, sessionId: string): Promise<ChatSessionRow | null>;
  listMessages(userId: string, sessionId: string): Promise<ChatMessageRow[]>;
  deleteSession(userId: string, sessionId: string): Promise<boolean>;
  getLastSequence(userId: string, sessionId: string): Promise<number>;
  insertMessages(rows: ChatSessionMessageInsert[]): Promise<void>;
  touchSession(userId: string, sessionId: string): Promise<void>;
};

export class ChatSessionNotFoundError extends Error {
  constructor(message = 'Chat session not found') {
    super(message);
    this.name = 'ChatSessionNotFoundError';
  }
}

export type AppendChatExchangeInput = {
  userId: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  sources: ChatSource[];
};

const DEFAULT_TITLE = 'Nueva conversacion';
const MAX_TITLE_LENGTH = 80;

function normalizeTitle(title?: string): string {
  const normalized = title?.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return DEFAULT_TITLE;
  }

  return normalized.length > MAX_TITLE_LENGTH
    ? normalized.slice(0, MAX_TITLE_LENGTH).trim()
    : normalized;
}

function isChatSource(value: unknown): value is ChatSource {
  return (
    typeof value === 'object'
    && value !== null
    && 'name' in value
    && 'content' in value
    && typeof (value as { name?: unknown }).name === 'string'
    && typeof (value as { content?: unknown }).content === 'string'
  );
}

function toSession(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: ChatMessageRow): ChatSessionMessage {
  const sources = Array.isArray(row.sources)
    ? row.sources.filter(isChatSource)
    : undefined;

  return {
    id: row.id,
    role: row.role,
    content: row.content,
    ...(sources && sources.length > 0 ? { sources } : {}),
    sequence: row.sequence,
    createdAt: row.created_at,
  };
}

function requireSession(row: ChatSessionRow | null): ChatSessionRow {
  if (!row) {
    throw new ChatSessionNotFoundError();
  }

  return row;
}

function rethrowSupabaseError(error: unknown): never {
  if (error instanceof Error) {
    throw error;
  }

  throw new Error('Supabase chat session operation failed');
}

function getSupabaseClient(): typeof import('./vector-db').supabase {
  const { supabase } = require('./vector-db') as typeof import('./vector-db');
  return supabase;
}

export function createSupabaseChatSessionStore(): ChatSessionStore {
  const supabase = getSupabaseClient();

  return {
    async listSessions(userId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id,user_id,title,created_at,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        rethrowSupabaseError(error);
      }

      return (data ?? []) as ChatSessionRow[];
    },
    async createSession(input) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: input.userId,
          title: input.title,
        })
        .select('id,user_id,title,created_at,updated_at')
        .single();

      if (error) {
        rethrowSupabaseError(error);
      }

      return data as ChatSessionRow;
    },
    async getSession(userId, sessionId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id,user_id,title,created_at,updated_at')
        .eq('user_id', userId)
        .eq('id', sessionId)
        .maybeSingle();

      if (error) {
        rethrowSupabaseError(error);
      }

      return data as ChatSessionRow | null;
    },
    async listMessages(userId, sessionId) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id,session_id,user_id,role,content,sources,sequence,created_at')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('sequence', { ascending: true });

      if (error) {
        rethrowSupabaseError(error);
      }

      return (data ?? []) as ChatMessageRow[];
    },
    async deleteSession(userId, sessionId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('id', sessionId)
        .select('id')
        .maybeSingle();

      if (error) {
        rethrowSupabaseError(error);
      }

      return Boolean(data);
    },
    async getLastSequence(userId, sessionId) {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('sequence')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        rethrowSupabaseError(error);
      }

      return typeof data?.sequence === 'number' ? data.sequence : 0;
    },
    async insertMessages(rows) {
      const { error } = await supabase
        .from('chat_messages')
        .insert(rows);

      if (error) {
        rethrowSupabaseError(error);
      }
    },
    async touchSession(userId, sessionId) {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('id', sessionId);

      if (error) {
        rethrowSupabaseError(error);
      }
    },
  };
}

export function createChatSessionService(store: ChatSessionStore) {
  return {
    async listSessions(userId: string): Promise<ChatSession[]> {
      const rows = await store.listSessions(userId);
      return rows.map(toSession);
    },
    async createSession(userId: string, title?: string): Promise<ChatSession> {
      const row = await store.createSession({
        userId,
        title: normalizeTitle(title),
      });

      return toSession(row);
    },
    async ensureSession(userId: string, sessionId: string): Promise<ChatSession> {
      return toSession(requireSession(await store.getSession(userId, sessionId)));
    },
    async listMessages(userId: string, sessionId: string): Promise<ChatSessionMessage[]> {
      requireSession(await store.getSession(userId, sessionId));
      const rows = await store.listMessages(userId, sessionId);
      return rows.map(toMessage);
    },
    async deleteSession(userId: string, sessionId: string): Promise<void> {
      const deleted = await store.deleteSession(userId, sessionId);

      if (!deleted) {
        throw new ChatSessionNotFoundError();
      }
    },
    async appendExchange(input: AppendChatExchangeInput): Promise<void> {
      requireSession(await store.getSession(input.userId, input.sessionId));
      const lastSequence = await store.getLastSequence(input.userId, input.sessionId);

      await store.insertMessages([
        {
          session_id: input.sessionId,
          user_id: input.userId,
          role: 'user',
          content: input.userMessage,
          sequence: lastSequence + 1,
        },
        {
          session_id: input.sessionId,
          user_id: input.userId,
          role: 'assistant',
          content: input.assistantMessage,
          sources: input.sources,
          sequence: lastSequence + 2,
        },
      ]);
      await store.touchSession(input.userId, input.sessionId);
    },
  };
}

let defaultService: ReturnType<typeof createChatSessionService> | null = null;

function getDefaultService() {
  if (!defaultService) {
    defaultService = createChatSessionService(createSupabaseChatSessionStore());
  }

  return defaultService;
}

export function listChatSessions(userId: string) {
  return getDefaultService().listSessions(userId);
}

export function createChatSession(userId: string, title?: string) {
  return getDefaultService().createSession(userId, title);
}

export function ensureChatSessionForUser(userId: string, sessionId: string) {
  return getDefaultService().ensureSession(userId, sessionId);
}

export function listChatMessages(userId: string, sessionId: string) {
  return getDefaultService().listMessages(userId, sessionId);
}

export function deleteChatSession(userId: string, sessionId: string) {
  return getDefaultService().deleteSession(userId, sessionId);
}

export function appendChatExchange(input: AppendChatExchangeInput) {
  return getDefaultService().appendExchange(input);
}
