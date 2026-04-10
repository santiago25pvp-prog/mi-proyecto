import { Request, Response } from 'express';
import { ingestUrl } from '../services/ingestion';
import { executeRagQuery } from '../services/rag';
import { SupabaseVectorAdapter } from '../services/supabase-vector-adapter';

const vectorStore = new SupabaseVectorAdapter();

// Validate URL format
function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export const ingestHandler = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL format' });
        
        const result = await ingestUrl(vectorStore, url);
        res.json(result);
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'Failed to ingest URL';
        
        // More specific error messages for debugging
        if (errorMessage.includes('timeout')) {
            return res.status(408).json({ error: 'Request timeout: URL took too long to respond' });
        }
        if (errorMessage.includes('404')) {
            return res.status(400).json({ error: 'URL not found' });
        }
        if (errorMessage.includes('HTTP')) {
            return res.status(502).json({ error: 'Failed to fetch URL' });
        }
        
        res.status(500).json({ error: 'Failed to ingest URL' });
    }
};

export const queryHandler = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });
        const result = await executeRagQuery(vectorStore, query);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to process query' });
    }
};

