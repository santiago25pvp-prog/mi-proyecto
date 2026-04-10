import 'dotenv/config';
import express from 'express';
import { authMiddleware } from './middleware/authMiddleware';
import { publicLimiter, authLimiter } from './middleware/rateLimiter';
import { chatHandler } from './controllers/rag';
import { ingestHandler, queryHandler } from './controllers/api';
import adminRoutes from './routes/admin';

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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
