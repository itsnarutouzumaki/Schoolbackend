import { Router } from 'express';
import { authenticateMiddleware } from '../../../middlewares/authenticate/index.js';
import { controllerHandler } from '../../../shared/http/index.js';
import { validateBody } from '../../../shared/validation/index.js';
import { sendTestParentNotificationController } from '../controllers/parent-notification-test.controller.js';
import { parentNotificationTestSchema } from '../validations/parent-notification-test.validation.js';

export const testNotificationRouter = Router();

testNotificationRouter.post(
  '/test-send',
  authenticateMiddleware,
  validateBody(parentNotificationTestSchema),
  controllerHandler(sendTestParentNotificationController),
);
