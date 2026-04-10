import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const promptTemplate = (context: string, question: string) => `
Responde la pregunta basándote únicamente en el contexto proporcionado. Si la respuesta no está en el contexto, di que no lo sabes.

Contexto:
${context}

Pregunta:
${question}
`;

export const generateAnswer = async (context: string, question: string) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = promptTemplate(context, question);
    const result = await model.generateContent(prompt);
    return result.response.text();
};
