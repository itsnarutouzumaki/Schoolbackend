import type { Express } from 'express';
import express from 'express';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/index.js';
import { authRouter } from '../features/auth/index.js';
import { resolveTenantMiddleware } from '../middlewares/index.js';
import { healthRouter } from './health.js';

export const apiV1Router = Router();
apiV1Router.use(resolveTenantMiddleware);
apiV1Router.use(express.json({ limit: '1mb' }));
apiV1Router.use('/auth', authRouter);

export function registerRoutes(app: Express): void {
  app.use('/health', healthRouter);
  app.get('/api/v1/openapi.json', (_request, response) => {
    response.json(openApiDocument);
  });
  app.use('/api/v1', apiV1Router);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    explorer: false,
    customSiteTitle: 'Greenwood School API',
  }));
}

export { healthRouter } from './health.js';
