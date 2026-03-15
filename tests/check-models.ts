
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function listModels() {
    const models = await genAI.listModels();
    console.log(models);
}
listModels().catch(console.error);
