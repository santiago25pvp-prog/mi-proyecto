import 'dotenv/config';
import express from 'express';
import { chatHandler } from './src/controllers/rag';
import { ingestHandler, queryHandler } from './src/controllers/api';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/chat', chatHandler);
app.post('/ingest', ingestHandler);
app.post('/query', queryHandler);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
