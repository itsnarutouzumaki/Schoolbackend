import { Router } from 'express';
import { authenticateMiddleware } from '../../../middlewares/authenticate/index.js';
import { controllerHandler } from '../../../shared/http/index.js';
import { validateBody } from '../../../shared/validation/index.js';
import { sendTestParentNotificationController } from '../controllers/parent-notification-test.controller.js';
import { parentNotificationTestSchema } from '../validations/parent-notification-test.validation.js';

export const testNotificationRouter = Router();

testNotificationRouter.post(
  '/test-send',
  (request, response, next) => {
    // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
    console.info('[TEMP-NOTIFICATION-DEBUG] test-send.request', {
      requestId: response.locals.requestId,
      method: request.method,
      schoolCode: response.locals.tenant?.schoolCode,
      hasAuthorization: Boolean(request.get('Authorization')),
    });
    next();
  },
  authenticateMiddleware,
  (request, response, next) => {
    // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
    console.info('[TEMP-NOTIFICATION-DEBUG] test-send.authenticated', {
      requestId: response.locals.requestId,
      role: response.locals.auth?.role,
      appAudience: response.locals.auth?.appAudience,
    });
    next();
  },
  validateBody(parentNotificationTestSchema),
  (_request, response, next) => {
    // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
    console.info('[TEMP-NOTIFICATION-DEBUG] test-send.validated', {
      requestId: response.locals.requestId,
      validated: true,
    });
    next();
  },
  controllerHandler(sendTestParentNotificationController),
);
