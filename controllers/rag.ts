import { Request, Response } from 'express';
import { executeRagQuery } from '../services/rag';
import { SupabaseVectorAdapter } from '../services/supabase-vector-adapter';

const vectorStore = new SupabaseVectorAdapter();

export const chatHandler = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        const result = await executeRagQuery(vectorStore, query);
        res.json(result);
    } catch (error) {
        console.error('Error in chatHandler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
