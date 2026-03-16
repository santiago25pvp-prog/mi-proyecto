import 'dotenv/config';
import express from 'express';
import { authMiddleware } from './src/middleware/authMiddleware';
import { publicLimiter, authLimiter } from './src/middleware/rateLimiter';
import { chatHandler } from './src/controllers/rag';
import { ingestHandler, queryHandler } from './src/controllers/api';
import adminRoutes from './src/routes/admin';

const app = express();
const port = 3000;

app.set('trust proxy', 1);
app.use(express.json());

app.get('/health', publicLimiter, (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/chat', authMiddleware, authLimiter, chatHandler);
app.post('/ingest', authMiddleware, authLimiter, ingestHandler);
app.post('/query', authMiddleware, authLimiter, queryHandler);
app.use('/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
