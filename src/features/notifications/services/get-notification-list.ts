import { NotificationModel } from '../models/index.js';
import type { NotificationRecipientRole } from './notification-types.js';

export async function getNotificationList(input: {
  schoolId: string;
  userId: string;
  role: NotificationRecipientRole;
}) {
  const notifications = await NotificationModel.find().where({
    schoolId: input.schoolId,
    recipientUserId: input.userId,
    targetAudience: input.role,
  })
    .select('eventId eventType subject description body senderName senderRole senderRoleLabel attachmentFileId readAt createdAt')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return notifications.map(notification => ({
    id: notification.eventId,
    type: notification.eventType,
    subject: notification.subject,
    description: notification.description ?? notification.body ?? '',
    senderName: notification.senderName ?? 'School administration',
    senderRole: notification.senderRole ?? 'schoolAdmin',
    senderRoleLabel: notification.senderRoleLabel ?? 'Admin',
    attachmentFileId: notification.attachmentFileId?.toString(),
    readAt: notification.readAt?.toISOString(),
    createdAt: notification.createdAt.toISOString(),
  }));
}
