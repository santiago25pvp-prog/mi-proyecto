import { Request, Response } from 'express';
import { ChatSessionNotFoundError } from '../services/chat-sessions';
import * as chatSessions from '../services/chat-sessions';
import { HttpError } from '../middleware/httpError';
import { getRequestId } from '../middleware/requestId';

function getUserId(req: Request): string {
  const userId = (req as any).user?.id;

  if (typeof userId !== 'string' || userId.length === 0) {
    throw new HttpError('Unauthorized: Missing or invalid token', 401, undefined, 'auth.missing');
  }

  return userId;
}

function mapChatSessionError(error: unknown): never {
  if (error instanceof ChatSessionNotFoundError) {
    throw new HttpError('Chat session not found', 404, undefined, 'chat.session_not_found');
  }

  throw error;
}

function readSessionId(req: Request): string {
  const sessionId = req.params.sessionId;

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new HttpError('Chat session not found', 404, undefined, 'chat.session_not_found');
  }

  return sessionId;
}

export async function listChatSessionsHandler(req: Request, res: Response) {
  const requestId = getRequestId(res);
  const userId = getUserId(req);
  const sessions = await chatSessions.listChatSessions(userId);

  res.json({ sessions, requestId });
}

export async function createChatSessionHandler(req: Request, res: Response) {
  const requestId = getRequestId(res);
  const userId = getUserId(req);
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
  const session = await chatSessions.createChatSession(userId, title);

  res.status(201).json({ session, requestId });
}

export async function listChatMessagesHandler(req: Request, res: Response) {
  const requestId = getRequestId(res);
  const userId = getUserId(req);
  const sessionId = readSessionId(req);

  try {
    const messages = await chatSessions.listChatMessages(userId, sessionId);
    res.json({ messages, requestId });
  } catch (error) {
    mapChatSessionError(error);
  }
}

export async function deleteChatSessionHandler(req: Request, res: Response) {
  const userId = getUserId(req);
  const sessionId = readSessionId(req);

  try {
    await chatSessions.deleteChatSession(userId, sessionId);
    res.status(204).send();
  } catch (error) {
    mapChatSessionError(error);
  }
}
