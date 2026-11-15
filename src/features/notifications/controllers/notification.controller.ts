import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../../shared/errors/index.js';
import { requireAuthContext } from '../../../shared/http/index.js';
import type { ApiSuccessResponse, RequestLocals, TypedController } from '../../../shared/http/index.js';
import {
  createNotificationAttachmentDownload,
  getNotificationDetails,
  getNotificationList,
  markNotificationRead,
  registerNotificationDevice,
  unregisterNotificationDevice,
} from '../services/index.js';
import type {
  NotificationDeviceRegistrationBody,
  NotificationDeviceRemovalBody,
} from '../validations/notification.validation.js';
import type { NotificationRecipientRole } from '../services/notification-types.js';

type EventParams = { eventId: string };
type NotificationList = Awaited<ReturnType<typeof getNotificationList>>;
type NotificationDetails = Awaited<ReturnType<typeof getNotificationDetails>>;
type AttachmentDownload = Awaited<ReturnType<typeof createNotificationAttachmentDownload>>;

function getRecipientContext(locals: RequestLocals) {
  const auth = requireAuthContext(locals);
  if (auth.role !== 'guardian' && auth.role !== 'teacher') {
    throw new ApiError(403, 'ROLE_FORBIDDEN', 'This endpoint is available to Parent and Teacher accounts only.');
  }
  return {
    schoolId: auth.schoolId,
    userId: auth.userId,
    role: auth.role as NotificationRecipientRole,
  };
}

function requireEventId(value: string) {
  if (!value.trim() || value.length > 160) {
    throw new ApiError(400, 'NOTIFICATION_ID_INVALID', 'A valid notification ID is required.');
  }
  return value;
}

export const getNotificationListController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<NotificationList>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (_request, response) => {
  const data = await getNotificationList(getRecipientContext(response.locals));
  response.status(200).json({ data });
};

export const getNotificationDetailsController: TypedController<
  EventParams,
  ApiSuccessResponse<NotificationDetails>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const data = await getNotificationDetails({
    ...getRecipientContext(response.locals),
    eventId: requireEventId(request.params.eventId),
  });
  response.status(200).json({ data });
};

export const markNotificationReadController: TypedController<
  EventParams,
  ApiSuccessResponse<{ updatedCount: number }>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const data = await markNotificationRead({
    ...getRecipientContext(response.locals),
    eventId: requireEventId(request.params.eventId),
  });
  response.status(200).json({ data });
};

export const markAllNotificationsReadController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<{ updatedCount: number }>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (_request, response) => {
  const data = await markNotificationRead({
    ...getRecipientContext(response.locals),
    markAll: true,
  });
  response.status(200).json({ data });
};

export const getNotificationAttachmentController: TypedController<
  EventParams,
  ApiSuccessResponse<AttachmentDownload>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const data = await createNotificationAttachmentDownload({
    ...getRecipientContext(response.locals),
    eventId: requireEventId(request.params.eventId),
  });
  response.status(200).json({ data });
};

export const registerNotificationDeviceController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<{ registered: true }>,
  NotificationDeviceRegistrationBody,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const recipient = getRecipientContext(response.locals);
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis; never log the token itself.
  console.info('[TEMP-NOTIFICATION-DEBUG] device-register.request', {
    requestId: response.locals.requestId,
    userId: recipient.userId,
    role: recipient.role,
    platform: request.body.platform,
    tokenPresent: Boolean(request.body.token),
    tokenLength: request.body.token.length,
  });
  await registerNotificationDevice({
    ...recipient,
    platform: request.body.platform,
    token: request.body.token,
  });
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  console.info('[TEMP-NOTIFICATION-DEBUG] device-register.succeeded', {
    requestId: response.locals.requestId,
    userId: recipient.userId,
    role: recipient.role,
    platform: request.body.platform,
  });
  response.status(200).json({ data: { registered: true } });
};

export const unregisterNotificationDeviceController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<{ removed: true }>,
  NotificationDeviceRemovalBody,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  await unregisterNotificationDevice({
    ...getRecipientContext(response.locals),
    token: request.body.token,
  });
  response.status(200).json({ data: { removed: true } });
};
