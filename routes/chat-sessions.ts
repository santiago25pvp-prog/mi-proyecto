import { Router } from 'express';
import {
  createChatSessionHandler,
  deleteChatSessionHandler,
  listChatMessagesHandler,
  listChatSessionsHandler,
} from '../controllers/chat-sessions';

const router = Router();

router.get('/', listChatSessionsHandler);
router.post('/', createChatSessionHandler);
router.get('/:sessionId/messages', listChatMessagesHandler);
router.delete('/:sessionId', deleteChatSessionHandler);

export default router;
