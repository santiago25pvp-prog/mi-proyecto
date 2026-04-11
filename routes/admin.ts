import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { listDocumentsHandler, deleteDocumentHandler, getStatsHandler } from '../controllers/admin';
import { validateRequest } from '../middleware/requestValidation';

const router = Router();

// Middleware to ensure all routes require both auth and admin access
router.use(authMiddleware, adminMiddleware);

router.get(
  '/documents',
  validateRequest([
    { source: 'query', field: 'page', type: 'int', defaultValue: 1, min: 1, message: 'page must be a positive integer' },
    { source: 'query', field: 'pageSize', type: 'int', defaultValue: 10, min: 1, message: 'pageSize must be a positive integer' },
  ]),
  listDocumentsHandler,
);

router.delete(
  '/documents/:id',
  validateRequest([
    { source: 'params', field: 'id', type: 'int', required: true, requiredMessage: 'id must be a positive integer', min: 1, message: 'id must be a positive integer' },
  ]),
  deleteDocumentHandler,
);

router.get('/stats', getStatsHandler);

export default router;
