import 'dotenv/config';
import express from 'express';
import logger from './services/logger';
import { authMiddleware } from './middleware/authMiddleware';
import { publicLimiter, authLimiter } from './middleware/rateLimiter';
import { ingestHandler, queryHandler } from './controllers/api';
import adminRoutes from './routes/admin';
import { validateRequest } from './middleware/requestValidation';
import { checkDependencies } from './services/health';
import { errorMiddleware, notFoundHandler } from './middleware/errorMiddleware';

// Validate required environment variables at startup
function validateEnvironment(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  logger.info('Environment variables validated');
}

validateEnvironment();

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

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

   app.get('/health', publicLimiter, async (_req, res) => {
     const dependencies = await checkDependencies();
     res.json({ status: 'ok', dependencies });
   });

   app.post(
     '/ingest',
     authMiddleware,
     authLimiter,
     validateRequest([
       { source: 'body', field: 'url', type: 'url', required: true, requiredMessage: 'URL is required', message: 'url must be a valid http or https URL' },
     ]),
     ingestHandler,
   );

   app.post(
     '/query',
     authMiddleware,
     authLimiter,
     validateRequest([
       { source: 'body', field: 'query', type: 'string', required: true, requiredMessage: 'Query is required', trim: true, minLength: 1 },
     ]),
     queryHandler,
   );

   app.use('/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}

const port = process.env.PORT || 3001;
const app = createApp();

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
  });
}
