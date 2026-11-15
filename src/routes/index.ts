import type { Express } from 'express';
import express from 'express';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/index.js';
import { authRouter, teacherAuthRouter } from '../features/auth/index.js';
import { guardianPortalRouter } from '../features/guardian-portal/index.js';
import { teacherPortalRouter } from '../features/teacher-portal/index.js';
import { notificationsRouter, testNotificationRouter } from '../features/notifications/index.js';
import { resolveTenantMiddleware } from '../middlewares/index.js';
import { healthRouter } from './health.js';

export const apiV1Router = Router();
apiV1Router.use(resolveTenantMiddleware);
apiV1Router.use(express.json({ limit: '1mb' }));
apiV1Router.use('/guardian/auth', authRouter);
apiV1Router.use('/teacher/auth', teacherAuthRouter);
apiV1Router.use('/teacher', teacherPortalRouter);
apiV1Router.use('/guardian', guardianPortalRouter);
apiV1Router.use('/notifications', testNotificationRouter);
apiV1Router.use('/notifications', notificationsRouter);

export function registerRoutes(app: Express): void {
  app.use('/health', healthRouter);
  app.get('/api/v1/openapi.json', (_request, response) => {
    response.json(openApiDocument);
  });
  app.use('/api/v1', apiV1Router);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    explorer: false,
    customSiteTitle: 'School Management API',
  }));
}

export { healthRouter } from './health.js';
