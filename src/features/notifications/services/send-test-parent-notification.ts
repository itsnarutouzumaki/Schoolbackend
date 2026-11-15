import type { NotificationRecipientRole, NotificationRole } from './notification-types.js';
import { sendNotification } from './send-notification.js';

export async function sendTestNotification(input: {
  schoolId: string;
  senderId: string;
  senderRole: NotificationRole;
  receiverId: string;
  receiverRole: NotificationRecipientRole;
  subject: string;
  description: string;
  attachmentFileId?: string;
  diagnosticId?: string;
}) {
  return sendNotification({
    schoolId: input.schoolId,
    senderUserId: input.senderId,
    senderRole: input.senderRole,
    receiverUserIds: [input.receiverId],
    receiverRole: input.receiverRole,
    subject: input.subject,
    description: input.description,
    ...(input.attachmentFileId ? { attachmentFileId: input.attachmentFileId } : {}),
    eventType: 'general',
    diagnosticId: input.diagnosticId,
  });
}
