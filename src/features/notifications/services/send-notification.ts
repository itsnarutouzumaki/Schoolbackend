import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { UserModel } from '../../auth/models/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import {
  GuardianModel,
  SchoolAdminProfileModel,
  TeacherModel,
} from '../../people/models/index.js';
import { DeviceTokenModel, NotificationModel } from '../models/index.js';
import { decryptDeviceToken } from './device-token-crypto.js';
import { FcmDeliveryError, sendFcmMessage } from './send-fcm-message.js';
import type { NotificationRecipientRole, NotificationRole } from './notification-types.js';

type SendNotificationInput = {
  schoolId: string;
  senderUserId: string;
  senderRole: NotificationRole;
  receiverUserIds: string[];
  receiverRole: NotificationRecipientRole;
  subject: string;
  description: string;
  attachmentFileId?: string;
  eventType?: string;
  diagnosticId?: string;
};

async function getSenderIdentity(input: Pick<SendNotificationInput, 'schoolId' | 'senderUserId' | 'senderRole'>) {
  const profileFilter = { schoolId: input.schoolId, userId: input.senderUserId };
  if (input.senderRole === 'guardian') {
    const profile = await GuardianModel.findOne(profileFilter).select('fullName').lean();
    if (!profile?.fullName) {
      throw new ApiError(403, 'SENDER_PROFILE_UNAVAILABLE', 'The sender profile is not available.');
    }
    return { name: profile.fullName, roleLabel: 'Parent' };
  }
  if (input.senderRole === 'teacher') {
    const profile = await TeacherModel.findOne(profileFilter).select('displayName').lean();
    if (!profile?.displayName) {
      throw new ApiError(403, 'SENDER_PROFILE_UNAVAILABLE', 'The sender profile is not available.');
    }
    return { name: profile.displayName, roleLabel: 'Teacher' };
  }
  const profile = await SchoolAdminProfileModel.findOne(profileFilter).select('displayName title').lean();
  if (!profile?.displayName) {
    throw new ApiError(403, 'SENDER_PROFILE_UNAVAILABLE', 'The sender profile is not available.');
  }
  return { name: profile.displayName, roleLabel: profile.title?.trim() || 'Admin' };
}

function createFcmMessage(input: {
  token: string;
  eventId: string;
  eventType: string;
  subject: string;
  description: string;
  senderUserId: string;
  senderRole: NotificationRole;
  senderName: string;
  senderRoleLabel: string;
  attachmentFileId?: string;
  receiverRole: NotificationRecipientRole;
  platform: string;
}) {
  const data = {
    eventId: input.eventId,
    type: input.eventType,
    subject: input.subject,
    message: input.description,
    senderId: input.senderUserId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    senderRoleLabel: input.senderRoleLabel,
    ...(input.attachmentFileId ? { attachmentFileId: input.attachmentFileId } : {}),
  };
  return {
    token: input.token,
    notification: { title: input.subject, body: input.description },
    data,
    ...(input.platform === 'android' ? {
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: input.receiverRole === 'teacher' ? 'teacher_updates' : 'school_updates',
        },
      },
    } : {}),
    ...(input.platform === 'ios' ? { apns: { payload: { aps: { sound: 'default' } } } } : {}),
  };
}

async function deliverToRecipient(input: {
  notificationId: Types.ObjectId;
  schoolId: string;
  recipientUserId: Types.ObjectId;
  receiverRole: NotificationRecipientRole;
  eventId: string;
  eventType: string;
  subject: string;
  description: string;
  senderUserId: string;
  senderRole: NotificationRole;
  senderName: string;
  senderRoleLabel: string;
  attachmentFileId?: string;
  diagnosticId?: string;
}) {
  const devices = await DeviceTokenModel.find().where({
    schoolId: input.schoolId,
    userId: input.recipientUserId,
    appAudience: input.receiverRole,
    status: 'active',
  }).select('+encryptedToken +tokenHash');
  const attemptedAt = new Date();
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  console.info('[TEMP-NOTIFICATION-DEBUG] delivery.devices-found', {
    requestId: input.diagnosticId,
    eventId: input.eventId,
    registeredActiveDeviceCount: devices.length,
    expectedRole: input.receiverRole,
  });
  if (devices.length === 0) {
    const deviceInventory = await DeviceTokenModel.find().where({
      schoolId: input.schoolId,
      userId: input.recipientUserId,
    }).select('appAudience platform status lastSeenAt revokedAt').lean();
    // TEMP NOTIFICATION DEBUG: deliberately excludes device-token values.
    console.info('[TEMP-NOTIFICATION-DEBUG] delivery.no-active-device-match', {
      requestId: input.diagnosticId,
      eventId: input.eventId,
      registeredDeviceInventory: deviceInventory.map(device => ({
        appAudience: device.appAudience,
        platform: device.platform,
        status: device.status,
        lastSeenAt: device.lastSeenAt?.toISOString(),
        revokedAt: device.revokedAt?.toISOString(),
      })),
    });
    await NotificationModel.updateOne(
      { _id: input.notificationId, schoolId: input.schoolId },
      { $set: { pushStatus: 'failed', pushAttemptedAt: attemptedAt } },
    );
    console.warn('Notification saved without push delivery because the recipient has no active device tokens.', {
      notificationId: input.notificationId.toString(),
      receiverUserId: input.recipientUserId.toString(),
      receiverRole: input.receiverRole,
      requestId: input.diagnosticId,
    });
    return { eventId: input.eventId, pushStatus: 'failed' as const, deliveredDevices: 0 };
  }

  const deliveryResults = await Promise.all(devices.map(async device => {
    try {
      // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
      console.info('[TEMP-NOTIFICATION-DEBUG] delivery.fcm-attempt', {
        requestId: input.diagnosticId,
        eventId: input.eventId,
        deviceTokenId: device._id.toString(),
        platform: device.platform,
      });
      await sendFcmMessage(createFcmMessage({
        token: decryptDeviceToken(device.encryptedToken),
        eventId: input.eventId,
        eventType: input.eventType,
        subject: input.subject,
        description: input.description,
        senderUserId: input.senderUserId,
        senderRole: input.senderRole,
        senderName: input.senderName,
        senderRoleLabel: input.senderRoleLabel,
        attachmentFileId: input.attachmentFileId,
        receiverRole: input.receiverRole,
        platform: device.platform,
      }));
      // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
      console.info('[TEMP-NOTIFICATION-DEBUG] delivery.fcm-succeeded', {
        requestId: input.diagnosticId,
        eventId: input.eventId,
        deviceTokenId: device._id.toString(),
      });
      return true;
    } catch (error) {
      const code = error instanceof FcmDeliveryError ? error.code : 'FCM_DELIVERY_ERROR';
      console.error('Notification push delivery failed for a registered device.', {
        notificationId: input.notificationId.toString(),
        requestId: input.diagnosticId,
        deviceTokenId: device._id.toString(),
        code,
        message: error instanceof Error ? error.message : 'Unknown delivery error.',
      });
      if (error instanceof FcmDeliveryError && error.invalidToken) {
        device.status = 'revoked';
        device.revokedAt = new Date();
        await device.save();
      }
      return false;
    }
  }));
  const deliveredDevices = deliveryResults.filter(Boolean).length;
  const pushStatus = deliveredDevices > 0 ? 'sent' : 'failed';
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  console.info('[TEMP-NOTIFICATION-DEBUG] delivery.completed', {
    requestId: input.diagnosticId,
    eventId: input.eventId,
    registeredActiveDeviceCount: devices.length,
    deliveredDevices,
    pushStatus,
  });
  await NotificationModel.updateOne(
    { _id: input.notificationId, schoolId: input.schoolId },
    {
      $set: {
        pushStatus,
        pushAttemptedAt: attemptedAt,
        ...(deliveredDevices > 0 ? { deliveredAt: new Date() } : {}),
      },
    },
  );
  return { eventId: input.eventId, pushStatus, deliveredDevices };
}

export async function sendNotification(input: SendNotificationInput) {
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  if (input.diagnosticId) {
    console.info('[TEMP-NOTIFICATION-DEBUG] send.begin', {
      requestId: input.diagnosticId,
      senderId: input.senderUserId,
      senderRole: input.senderRole,
      receiverIds: input.receiverUserIds,
      receiverRole: input.receiverRole,
      hasAttachment: Boolean(input.attachmentFileId),
    });
  }
  const receiverUserIds = [...new Set(input.receiverUserIds)];
  if (receiverUserIds.length === 0 || receiverUserIds.length !== input.receiverUserIds.length) {
    throw new ApiError(400, 'NOTIFICATION_RECIPIENTS_INVALID', 'At least one unique recipient is required.');
  }
  if (!Types.ObjectId.isValid(input.schoolId) || !Types.ObjectId.isValid(input.senderUserId)) {
    throw new ApiError(400, 'NOTIFICATION_ID_INVALID', 'A valid school and sender ID are required.');
  }
  if (receiverUserIds.some(id => !Types.ObjectId.isValid(id))) {
    throw new ApiError(400, 'NOTIFICATION_RECIPIENTS_INVALID', 'Every recipient ID must be valid.');
  }

  const senderAccount = await UserModel.findOne().where({
    _id: input.senderUserId,
    schoolId: input.schoolId,
    role: input.senderRole,
    status: 'active',
  }).select('_id').lean();
  if (!senderAccount) {
    // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
    console.error('[TEMP-NOTIFICATION-DEBUG] send.sender-not-active-or-role-mismatch', {
      requestId: input.diagnosticId,
      senderRole: input.senderRole,
    });
    throw new ApiError(403, 'NOTIFICATION_SENDER_UNAVAILABLE', 'The sender account is not available.');
  }
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  if (input.diagnosticId) {
    console.info('[TEMP-NOTIFICATION-DEBUG] send.sender-validated', {
      requestId: input.diagnosticId,
    });
  }
  const receivers = await UserModel.find().where({
    _id: { $in: receiverUserIds },
    schoolId: input.schoolId,
    role: input.receiverRole,
    status: 'active',
  }).select('_id').lean();
  if (receivers.length !== receiverUserIds.length) {
    // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
    console.error('[TEMP-NOTIFICATION-DEBUG] send.receiver-not-active-or-role-or-school-mismatch', {
      requestId: input.diagnosticId,
      requestedRecipientCount: receiverUserIds.length,
      matchedRecipientCount: receivers.length,
      receiverRole: input.receiverRole,
    });
    throw new ApiError(404, 'NOTIFICATION_RECIPIENT_UNAVAILABLE', 'One or more recipients are not available.');
  }
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  if (input.diagnosticId) {
    console.info('[TEMP-NOTIFICATION-DEBUG] send.receivers-validated', {
      requestId: input.diagnosticId,
      recipientCount: receivers.length,
    });
  }

  let attachmentFileId: Types.ObjectId | undefined;
  if (input.attachmentFileId) {
    if (!Types.ObjectId.isValid(input.attachmentFileId)) {
      throw new ApiError(400, 'NOTIFICATION_ATTACHMENT_INVALID', 'The attachment reference is invalid.');
    }
    attachmentFileId = new Types.ObjectId(input.attachmentFileId);
    const file = await FileRecordModel.exists({
      _id: attachmentFileId,
      schoolId: input.schoolId,
      ownerUserId: input.senderUserId,
      status: 'ready',
    });
    if (!file) {
      throw new ApiError(404, 'NOTIFICATION_ATTACHMENT_UNAVAILABLE', 'The ready attachment was not found.');
    }
  }

  const senderIdentity = await getSenderIdentity(input);
  const eventId = randomUUID();
  const eventType = input.eventType?.trim() || 'general';
  const notificationRecords = await NotificationModel.insertMany(receivers.map(receiver => ({
    schoolId: new Types.ObjectId(input.schoolId),
    eventId,
    eventType,
    subject: input.subject.trim(),
    description: input.description.trim(),
    senderUserId: new Types.ObjectId(input.senderUserId),
    senderRole: input.senderRole,
    senderName: senderIdentity.name,
    senderRoleLabel: senderIdentity.roleLabel,
    targetAudience: input.receiverRole,
    recipientUserId: receiver._id,
    ...(attachmentFileId ? { attachmentFileId } : {}),
    pushStatus: 'pending',
  })));
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  console.info('[TEMP-NOTIFICATION-DEBUG] send.records-persisted', {
    requestId: input.diagnosticId,
    eventId,
    recordCount: notificationRecords.length,
  });

  const delivery = await Promise.all(notificationRecords.map(notification =>
    deliverToRecipient({
      notificationId: notification._id,
      schoolId: input.schoolId,
      recipientUserId: notification.recipientUserId,
      receiverRole: input.receiverRole,
      eventId,
      eventType,
      subject: input.subject.trim(),
      description: input.description.trim(),
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      senderName: senderIdentity.name,
      senderRoleLabel: senderIdentity.roleLabel,
      ...(attachmentFileId ? { attachmentFileId: attachmentFileId.toString() } : {}),
      diagnosticId: input.diagnosticId,
    }),
  ));
  return { eventId, recipientCount: delivery.length, delivery };
}
