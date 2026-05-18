import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ChatSessionNotFoundError,
  createChatSessionService,
  type ChatSessionMessageInsert,
  type ChatSessionStore,
} from '../services/chat-sessions';

function createStore(): ChatSessionStore & {
  sessions: any[];
  messages: any[];
} {
  const sessions: any[] = [];
  const messages: any[] = [];

  return {
    sessions,
    messages,
    async listSessions(userId) {
      return sessions
        .filter((session) => session.user_id === userId)
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    },
    async createSession(input) {
      const session = {
        id: `session-${sessions.length + 1}`,
        user_id: input.userId,
        title: input.title,
        created_at: '2026-05-17T00:00:00.000Z',
        updated_at: `2026-05-17T00:00:0${sessions.length}.000Z`,
      };
      sessions.push(session);
      return session;
    },
    async getSession(userId, sessionId) {
      return sessions.find((session) => session.user_id === userId && session.id === sessionId) ?? null;
    },
    async listMessages(userId, sessionId) {
      return messages
        .filter((message) => message.user_id === userId && message.session_id === sessionId)
        .sort((left, right) => left.sequence - right.sequence);
    },
    async deleteSession(userId, sessionId) {
      const index = sessions.findIndex((session) => session.user_id === userId && session.id === sessionId);

      if (index === -1) {
        return false;
      }

      sessions.splice(index, 1);
      return true;
    },
    async getLastSequence(_userId, sessionId) {
      const last = messages
        .filter((message) => message.session_id === sessionId)
        .sort((left, right) => right.sequence - left.sequence)[0];

      return last?.sequence ?? 0;
    },
    async insertMessages(rows: ChatSessionMessageInsert[]) {
      messages.push(...rows.map((row, index) => ({
        ...row,
        id: `message-${messages.length + index + 1}`,
        created_at: `2026-05-17T00:00:1${messages.length + index}.000Z`,
      })));
    },
    async touchSession(userId, sessionId) {
      const session = sessions.find((entry) => entry.user_id === userId && entry.id === sessionId);

      if (session) {
        session.updated_at = '2026-05-17T00:01:00.000Z';
      }
    },
  };
}

test('chat session service creates and lists user-scoped sessions', async () => {
  const store = createStore();
  const service = createChatSessionService(store);

  const created = await service.createSession('user-1', '  Primer tema  ');
  await service.createSession('user-2', 'Otro usuario');
  const sessions = await service.listSessions('user-1');

  assert.equal(created.title, 'Primer tema');
  assert.deepEqual(sessions, [
    {
      id: 'session-1',
      title: 'Primer tema',
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    },
  ]);
});

test('chat session service appends a user and assistant exchange with sequence numbers', async () => {
  const store = createStore();
  const service = createChatSessionService(store);
  const session = await service.createSession('user-1', 'Tema');

  await service.appendExchange({
    userId: 'user-1',
    sessionId: session.id,
    userMessage: 'Pregunta',
    assistantMessage: 'Respuesta',
    sources: [{ name: 'Manual', content: 'Contenido' }],
  });

  const messages = await service.listMessages('user-1', session.id);

  assert.deepEqual(messages.map((message) => ({
    role: message.role,
    content: message.content,
    sources: message.sources,
    sequence: message.sequence,
  })), [
    {
      role: 'user',
      content: 'Pregunta',
      sources: undefined,
      sequence: 1,
    },
    {
      role: 'assistant',
      content: 'Respuesta',
      sources: [{ name: 'Manual', content: 'Contenido' }],
      sequence: 2,
    },
  ]);
});

test('chat session service rejects cross-user access', async () => {
  const store = createStore();
  const service = createChatSessionService(store);
  const session = await service.createSession('user-1', 'Tema');

  await assert.rejects(
    () => service.listMessages('user-2', session.id),
    ChatSessionNotFoundError,
  );

  await assert.rejects(
    () => service.appendExchange({
      userId: 'user-2',
      sessionId: session.id,
      userMessage: 'Pregunta',
      assistantMessage: 'Respuesta',
      sources: [],
    }),
    ChatSessionNotFoundError,
  );
});

test('chat session service deletes only user-owned sessions', async () => {
  const store = createStore();
  const service = createChatSessionService(store);
  const owned = await service.createSession('user-1', 'Tema propio');
  const other = await service.createSession('user-2', 'Tema ajeno');

  await service.deleteSession('user-1', owned.id);

  assert.deepEqual(await service.listSessions('user-1'), []);
  assert.deepEqual((await service.listSessions('user-2')).map((session) => session.id), [other.id]);
  await assert.rejects(
    () => service.deleteSession('user-1', other.id),
    ChatSessionNotFoundError,
  );
});
