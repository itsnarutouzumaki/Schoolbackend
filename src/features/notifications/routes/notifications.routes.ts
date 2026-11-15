import { Router } from 'express';
import { authenticateMiddleware } from '../../../middlewares/authenticate/index.js';
import { requireNotificationAppMiddleware } from '../../../middlewares/require-notification-app/index.js';
import { controllerHandler } from '../../../shared/http/index.js';
import { validateBody } from '../../../shared/validation/index.js';
import {
  getNotificationAttachmentController,
  getNotificationDetailsController,
  getNotificationListController,
  markAllNotificationsReadController,
  markNotificationReadController,
  registerNotificationDeviceController,
  unregisterNotificationDeviceController,
} from '../controllers/notification.controller.js';
import {
  notificationDeviceRegistrationSchema,
  notificationDeviceRemovalSchema,
} from '../validations/notification.validation.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticateMiddleware, requireNotificationAppMiddleware);

notificationsRouter.get('/', controllerHandler(getNotificationListController));
notificationsRouter.patch('/read-all', controllerHandler(markAllNotificationsReadController));
notificationsRouter.post(
  '/devices',
  validateBody(notificationDeviceRegistrationSchema),
  controllerHandler(registerNotificationDeviceController),
);
notificationsRouter.delete(
  '/devices',
  validateBody(notificationDeviceRemovalSchema),
  controllerHandler(unregisterNotificationDeviceController),
);
notificationsRouter.get('/:eventId/attachment', controllerHandler(getNotificationAttachmentController));
notificationsRouter.patch('/:eventId/read', controllerHandler(markNotificationReadController));
notificationsRouter.get('/:eventId', controllerHandler(getNotificationDetailsController));
