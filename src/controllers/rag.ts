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
    const documents = await searchDocuments(query, 3);
    const context = documents.map((doc: any) => doc.content).join('\n');
    
    const model = genAI.getGenerativeModel({ 
        model: "models/gemini-2.5-flash",
        generationConfig: {
            maxOutputTokens: 1000
        }
    });
    const prompt = promptTemplate(context, query);
    const result = await model.generateContent(prompt);
    return result.response.text();
}

export const chatHandler = async (req: Request, res: Response) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        const answer = await ragQuery(query);
        res.json({ answer });
    } catch (error) {
        console.error('Error in chatHandler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
