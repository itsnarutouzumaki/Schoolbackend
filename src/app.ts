import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, env } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.disable('x-powered-by');
app.use((request, response, next) => {
  const requestId = randomUUID();
  response.setHeader('X-Request-Id', requestId);
  response.locals.requestId = requestId;
  next();
});
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/health', healthRouter);
app.get('/api/v1/openapi.json', (_request, response) => {
  response.json(openApiDocument);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  explorer: false,
  customSiteTitle: 'Greenwood School API',
}));

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API route does not exist.',
      requestId: response.locals.requestId,
      retryable: false,
    },
  });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  console.error('Unhandled API request error:', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'The server could not complete the request.',
      requestId: response.locals.requestId,
      retryable: true,
    },
  });
};

app.use(errorHandler);
