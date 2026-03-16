import { Request, Response } from 'express';
import * as adminService from '../services/adminService';

export const listDocumentsHandler = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const documents = await adminService.listDocuments(page, pageSize);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documents' });
  }
};

export const deleteDocumentHandler = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await adminService.deleteDocument(id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
};
