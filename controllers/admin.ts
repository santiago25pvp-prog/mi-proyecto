import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { getValidatedRequest } from '../middleware/requestValidation';
import { getRequestId } from '../middleware/requestId';

export const listDocumentsHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const { query } = getValidatedRequest(res);
  const page = query.page as number;
  const pageSize = query.pageSize as number;
  const documents = await adminService.listDocuments(page, pageSize);
  res.json({ ...documents, requestId });
};

export const deleteDocumentHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const { params } = getValidatedRequest(res);
  const id = params.id as number;
  await adminService.deleteDocument(id);
  res.json({ message: 'Document deleted successfully', requestId });
};

export const getStatsHandler = async (req: Request, res: Response) => {
  const requestId = getRequestId(res);
  const stats = await adminService.getStats();
  res.json({ ...stats, requestId });
};
