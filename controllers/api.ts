import { Request, Response } from 'express';
import logger from '../services/logger';
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
    const requestId = Math.random().toString(36).substr(2, 9);
    logger.info(`[${requestId}] Ingest request started`, { url: req.body.url });
    
    try {
        const { url } = req.body;
        if (!url) {
            logger.warn(`[${requestId}] URL missing in request body`);
            return res.status(400).json({ error: 'URL is required' });
        }
        if (!isValidUrl(url)) {
            logger.warn(`[${requestId}] Invalid URL format: ${url}`);
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        const result = await ingestUrl(vectorStore, url);
        logger.info(`[${requestId}] Ingest completed successfully`, { result });
        res.json(result);
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        logger.error(`[${requestId}] Ingest failed`, { error });
        
        // More specific error messages for debugging
        if (error.includes('timeout')) {
            return res.status(408).json({ error: 'Request timeout: URL took too long to respond' });
        }
        if (error.includes('404')) {
            return res.status(400).json({ error: 'URL not found' });
        }
        if (error.includes('HTTP')) {
            return res.status(502).json({ error: 'Failed to fetch URL' });
        }
        
        res.status(500).json({ error: 'Failed to ingest URL' });
    }
};

export const queryHandler = async (req: Request, res: Response) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    logger.info(`[${requestId}] Query request started`, { query: req.body.query?.substring(0, 50) });
    
    try {
        const { query } = req.body;
        if (!query) {
            logger.warn(`[${requestId}] Query missing in request body`);
            return res.status(400).json({ error: 'Query is required' });
        }
        
        const result = await executeRagQuery(vectorStore, query);
        logger.info(`[${requestId}] Query completed successfully`, { sourcesCount: result.sources.length });
        res.json(result);
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        logger.error(`[${requestId}] Query failed`, { error });
        res.status(500).json({ error: 'Failed to process query' });
    }
};

