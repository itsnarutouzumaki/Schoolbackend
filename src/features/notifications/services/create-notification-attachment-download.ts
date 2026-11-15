import { env } from '../../../config/env.js';
import { ApiError } from '../../../shared/errors/index.js';
import { createSignedDownloadUrl } from '../../files/storage/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import { NotificationModel } from '../models/index.js';
import type { NotificationRecipientRole } from './notification-types.js';

export async function createNotificationAttachmentDownload(input: {
  schoolId: string;
  userId: string;
  role: NotificationRecipientRole;
  eventId: string;
}) {
  const notification = await NotificationModel.findOne().where({
    schoolId: input.schoolId,
    recipientUserId: input.userId,
    targetAudience: input.role,
    eventId: input.eventId,
  }).select('attachmentFileId');
  if (!notification?.attachmentFileId) {
    throw new ApiError(404, 'NOTIFICATION_ATTACHMENT_NOT_FOUND', 'The notification attachment was not found.');
  }
  const file = await FileRecordModel.findOne().where({
    _id: notification.attachmentFileId,
    schoolId: input.schoolId,
    status: 'ready',
  }).select('+storageRef +storageGeneration originalFileName contentType');
  if (!file?.storageRef || !file.storageGeneration) {
    throw new ApiError(404, 'NOTIFICATION_ATTACHMENT_NOT_FOUND', 'The notification attachment was not found.');
  }
  return {
    downloadUrl: await createSignedDownloadUrl(file.storageRef, file.storageGeneration),
    fileName: file.originalFileName,
    contentType: file.contentType,
    expiresInSeconds: env.GCS_SIGNED_URL_TTL_SECONDS,
  };
}
