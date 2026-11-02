import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { corsOrigins, env } from './config/index.js';
import { errorHandler, notFoundHandler } from './middlewares/index.js';
import { ApiError } from './shared/index.js';
import { registerRoutes } from './routes/index.js';

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
    callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'));
  },
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        requestId: response.locals.requestId,
        retryable: true,
      },
    });
  },
}));

registerRoutes(app);
app.use(notFoundHandler);
app.use(errorHandler);
