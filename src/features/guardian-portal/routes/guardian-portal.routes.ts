import type { ParamsDictionary } from 'express-serve-static-core';
import { Router } from 'express';
import type { ParsedQs } from 'qs';
import { authenticateMiddleware } from '../../../middlewares/authenticate/index.js';
import { requireGuardianMiddleware } from '../../../middlewares/require-guardian/index.js';
import { controllerHandler } from '../../../shared/http/index.js';
import {
  completeGuardianUploadController,
  createGuardianChildLinkRequestController,
  createGuardianComplaintController,
  createGuardianDownloadUrlController,
  createGuardianLeaveRequestController,
  createGuardianUploadIntentController,
  getGuardianBootstrapController,
  getGuardianResource,
  markGuardianNotificationController,
  updateGuardianProfileController,
} from '../controllers/index.js';
import type { ApiErrorResponse, ApiSuccessResponse, RequestLocals } from '../../../shared/http/index.js';
import { getGuardianBootstrap } from '../services/index.js';

type Bootstrap = Awaited<ReturnType<typeof getGuardianBootstrap>>;

export const guardianPortalRouter = Router();

guardianPortalRouter.get<
  ParamsDictionary,
  ApiSuccessResponse<Bootstrap> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>(
  '/bootstrap',
  authenticateMiddleware,
  requireGuardianMiddleware,
  controllerHandler(getGuardianBootstrapController),
);
guardianPortalRouter.get('/me', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('profile'));
guardianPortalRouter.get('/me/children', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('children'));
guardianPortalRouter.get('/child-link-requests', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('childLinkRequests'));
guardianPortalRouter.get('/leave-requests', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('leaveRequests'));
guardianPortalRouter.get('/complaints', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('complaints'));
guardianPortalRouter.get('/notifications', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('notifications'));
guardianPortalRouter.get('/children/:childId/attendance', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('attendance'));
guardianPortalRouter.get('/children/:childId/results', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('results'));
guardianPortalRouter.get('/children/:childId/fees', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('fees'));
guardianPortalRouter.get('/children/:childId/teachers', authenticateMiddleware, requireGuardianMiddleware, getGuardianResource('teachers'));
guardianPortalRouter.patch('/me', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(updateGuardianProfileController));
guardianPortalRouter.post('/child-link-requests', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(createGuardianChildLinkRequestController));
guardianPortalRouter.post('/leave-requests', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(createGuardianLeaveRequestController));
guardianPortalRouter.post('/complaints', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(createGuardianComplaintController));
guardianPortalRouter.patch('/notifications/read-all', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(markGuardianNotificationController));
guardianPortalRouter.patch('/notifications/:eventId/read', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(markGuardianNotificationController));
guardianPortalRouter.post('/files/upload-intents', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(createGuardianUploadIntentController));
guardianPortalRouter.post('/files/:fileId/complete', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(completeGuardianUploadController));
guardianPortalRouter.get('/files/:fileId/download', authenticateMiddleware, requireGuardianMiddleware, controllerHandler(createGuardianDownloadUrlController));
