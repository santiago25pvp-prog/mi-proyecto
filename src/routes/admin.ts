import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { listDocumentsHandler, deleteDocumentHandler, getStatsHandler } from '../controllers/admin';

const router = Router();

// Middleware to ensure all routes require both auth and admin access
router.use(authMiddleware, adminMiddleware);

router.get('/documents', listDocumentsHandler);
router.delete('/documents/:id', deleteDocumentHandler);
router.get('/stats', getStatsHandler);

export default router;
