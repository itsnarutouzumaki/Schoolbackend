import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../../shared/errors/index.js';
import { requireAuthContext } from '../../../shared/http/index.js';
import type { ApiSuccessResponse, RequestLocals, TypedController } from '../../../shared/http/index.js';
import { sendTestNotification } from '../services/send-test-parent-notification.js';
import type { ParentNotificationTestBody } from '../validations/parent-notification-test.validation.js';

type TestNotificationResult = Awaited<ReturnType<typeof sendTestNotification>>;

export const sendTestParentNotificationController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<TestNotificationResult>,
  ParentNotificationTestBody,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const tenant = response.locals.tenant;
  const auth = requireAuthContext(response.locals);
  if (!tenant) {
    throw new ApiError(400, 'SCHOOL_CODE_REQUIRED', 'The selected school could not be resolved.');
  }
  if (auth.role !== 'teacher' || auth.appAudience !== 'teacher') {
    throw new ApiError(403, 'ROLE_FORBIDDEN', 'Only authenticated Teacher accounts can use this test endpoint.');
  }
  const data = await sendTestNotification({
    schoolId: tenant.schoolId,
    senderId: auth.userId,
    senderRole: 'teacher',
    receiverId: request.body.receiverId,
    receiverRole: request.body.receiverRole,
    subject: request.body.subject,
    description: request.body.description,
    ...(request.body.attachmentFileId ? { attachmentFileId: request.body.attachmentFileId } : {}),
  });
  response.status(201).json({ data });
};
