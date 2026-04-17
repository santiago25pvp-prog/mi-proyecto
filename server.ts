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
import { getRequestId, requestIdMiddleware } from './middleware/requestId';
import { telemetryReliabilityHandler } from './services/observability/telemetry-endpoint';

function resolveAllowedOrigin(env: NodeJS.ProcessEnv): string {
  const configuredOrigin = env.ALLOWED_ORIGIN?.trim();
  const isProduction = env.NODE_ENV === 'production';

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (isProduction) {
    throw new Error('Missing required environment variable: ALLOWED_ORIGIN (required in production)');
  }

  return 'http://localhost:3000';
}

// Validate required environment variables at startup
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ];

  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  resolveAllowedOrigin(env);

  logger.info('Environment variables validated');
}

validateEnvironment();

export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const app = express();
  const allowedOrigin = resolveAllowedOrigin(env);

  app.set('trust proxy', 1);
  app.use(requestIdMiddleware);

  app.use((req, res, next) => {
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
    res.json({ status: 'ok', dependencies, requestId: getRequestId(res) });
  });

  app.post(
    '/telemetry/reliability',
    publicLimiter,
    telemetryReliabilityHandler,
  );

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
