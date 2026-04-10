import { Request, Response } from 'express';
import { executeRagQuery } from '../services/rag';
import { SupabaseVectorAdapter } from '../services/supabase-vector-adapter';
import { getValidatedRequest } from '../middleware/requestValidation';

const vectorStore = new SupabaseVectorAdapter();

export const chatHandler = async (req: Request, res: Response) => {
  const { body } = getValidatedRequest(res);
  const result = await executeRagQuery(vectorStore, body.query as string);
  res.json(result);
};
