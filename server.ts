import 'dotenv/config';
import express from 'express';
import { authMiddleware } from './src/middleware/authMiddleware';
import { chatHandler } from './src/controllers/rag';
import { ingestHandler, queryHandler } from './src/controllers/api';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/chat', authMiddleware, chatHandler);
app.post('/ingest', authMiddleware, ingestHandler);
app.post('/query', authMiddleware, queryHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
