import { ApiError } from '../../../shared/errors/index.js';
import { NotificationModel } from '../models/index.js';
import type { NotificationRecipientRole } from './notification-types.js';

export async function markNotificationRead(input: {
  schoolId: string;
  userId: string;
  role: NotificationRecipientRole;
  eventId?: string;
  markAll?: boolean;
}) {
  const filter = {
    schoolId: input.schoolId,
    recipientUserId: input.userId,
    targetAudience: input.role,
  };
  if (input.markAll) {
    const result = await NotificationModel.updateMany(
      { ...filter, readAt: { $exists: false } },
      { $set: { readAt: new Date() } },
    );
    return { updatedCount: result.modifiedCount };
  }
  if (!input.eventId) {
    throw new ApiError(400, 'NOTIFICATION_ID_REQUIRED', 'A notification ID is required.');
  }
  const notification = await NotificationModel.findOne().where({ ...filter, eventId: input.eventId });
  if (!notification) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'The notification was not found.');
  }
  if (notification.readAt) return { updatedCount: 0 };
  notification.readAt = new Date();
  await notification.save();
  return { updatedCount: 1 };
}
