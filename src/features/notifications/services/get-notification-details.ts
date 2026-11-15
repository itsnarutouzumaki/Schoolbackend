import { NotificationModel } from '../models/index.js';
import type { NotificationRecipientRole } from './notification-types.js';
import { ApiError } from '../../../shared/errors/index.js';
import { FileRecordModel } from '../../files/models/index.js';

export async function getNotificationDetails(input: {
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
  }).select('eventId eventType subject description body senderName senderRole senderRoleLabel attachmentFileId readAt createdAt').lean();
  if (!notification) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'The notification was not found.');
  }

  const file = notification.attachmentFileId
    ? await FileRecordModel.findOne().where({
      _id: notification.attachmentFileId,
      schoolId: input.schoolId,
      status: 'ready',
    }).select('originalFileName contentType sizeBytes').lean()
    : null;
  return {
    id: notification.eventId,
    type: notification.eventType,
    senderName: notification.senderName ?? 'School administration',
    senderRole: notification.senderRole ?? 'schoolAdmin',
    senderRoleLabel: notification.senderRoleLabel ?? 'Admin',
    subject: notification.subject,
    description: notification.description ?? notification.body ?? '',
    attachment: file && notification.attachmentFileId ? {
      id: notification.attachmentFileId.toString(),
      fileName: file.originalFileName,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
    } : null,
    readAt: notification.readAt?.toISOString(),
    createdAt: notification.createdAt.toISOString(),
  };
}
