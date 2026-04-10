import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { getValidatedRequest } from '../middleware/requestValidation';

export const listDocumentsHandler = async (req: Request, res: Response) => {
  const { query } = getValidatedRequest(res);
  const page = query.page as number;
  const pageSize = query.pageSize as number;
  const documents = await adminService.listDocuments(page, pageSize);
  res.json(documents);
};

export const deleteDocumentHandler = async (req: Request, res: Response) => {
  const { params } = getValidatedRequest(res);
  const id = params.id as number;
  await adminService.deleteDocument(id);
  res.json({ message: 'Document deleted successfully' });
};

export const getStatsHandler = async (req: Request, res: Response) => {
  const stats = await adminService.getStats();
  res.json(stats);
};
