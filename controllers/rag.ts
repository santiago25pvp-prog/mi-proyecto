import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchDocuments } from '../services/retrieval';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const promptTemplate = (context: string, question: string) => `
Responde la pregunta basándote únicamente en el contexto proporcionado. Si la respuesta no está en el contexto, di que no lo sabes.

Contexto:
${context}

Pregunta:
${question}
`;

export const ragQuery = async (query: string) => {
    // 1. Search documents in vector DB
    const documents = await searchDocuments(query, 5);
    
    if (!documents || documents.length === 0) {
        return {
            answer: "No encontré documentos relevantes para responder tu pregunta.",
            sources: []
        };
    }

    // 2. Build context from documents
    const context = documents
        .map((doc: any) => doc.content || doc.text || '')
        .join('\n\n');

    // 3. Generate answer with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = promptTemplate(context, query);
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // 4. Return answer with sources
    const sources = documents.map((doc: any) => ({
        name: doc.name || doc.title || 'Documento',
        content: doc.content || doc.text || ''
    }));

    return { answer, sources };
}

export const chatHandler = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        const result = await ragQuery(query);
        res.json(result);
    } catch (error) {
        console.error('Error in chatHandler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
