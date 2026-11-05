import { ApiError } from '../../../shared/errors/index.js';
import { NotificationModel } from '../../notifications/models/index.js';

type MarkGuardianNotificationInput = {
  schoolId: string;
  userId: string;
  eventId?: string;
  markAll?: boolean;
};

export async function markGuardianNotification(input: MarkGuardianNotificationInput) {
  const baseFilter = {
    schoolId: input.schoolId,
    recipientUserId: input.userId,
    targetAudience: 'guardian',
  };
  if (!input.markAll && !input.eventId) {
    throw new ApiError(400, 'NOTIFICATION_ID_REQUIRED', 'A notification ID is required.');
  }
  if (!input.markAll) {
    const notification = await NotificationModel.findOne().where({ ...baseFilter, eventId: input.eventId });
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'The notification was not found.');
    }
    if (notification.readAt) return { updatedCount: 0 };
    notification.readAt = new Date();
    await notification.save();
    return { updatedCount: 1 };
  }
  const updated = await NotificationModel.updateMany(
    { ...baseFilter, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  );
  return { updatedCount: updated.modifiedCount };
}
