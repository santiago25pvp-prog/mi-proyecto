import { Request, Response } from 'express';
import { ingestUrl } from '../services/ingestion';
import { executeRagQuery } from '../services/rag';

export const ingestHandler = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        const result = await ingestUrl(url);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to ingest URL' });
    }
};

export const queryHandler = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });
        const result = await executeRagQuery(query);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to process query' });
    }
};
