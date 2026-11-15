import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { DeviceTokenModel } from '../models/index.js';
import { encryptDeviceToken, hashDeviceToken } from './device-token-crypto.js';
import type { NotificationPlatform, NotificationRecipientRole } from './notification-types.js';

export async function registerNotificationDevice(input: {
  schoolId: string;
  userId: string;
  role: NotificationRecipientRole;
  platform: NotificationPlatform;
  token: string;
}) {
  // TEMP NOTIFICATION DEBUG: token contents are intentionally not logged.
  console.info('[TEMP-NOTIFICATION-DEBUG] device-register.encrypting', {
    userId: input.userId,
    role: input.role,
    platform: input.platform,
    encryptionKeyConfigured: Boolean(process.env.DEVICE_TOKEN_ENCRYPTION_KEY),
  });
  const encryptedToken = encryptDeviceToken(input.token);
  const now = new Date();
  const result = await DeviceTokenModel.updateOne(
    { schoolId: input.schoolId, tokenHash: hashDeviceToken(input.token) },
    {
      $set: {
        userId: new Types.ObjectId(input.userId),
        appAudience: input.role,
        platform: input.platform,
        encryptedToken,
        status: 'active',
        lastSeenAt: now,
      },
      $unset: { revokedAt: 1 },
      $setOnInsert: { schoolId: new Types.ObjectId(input.schoolId) },
    },
    { upsert: true, runValidators: true },
  );
  // TEMP NOTIFICATION DEBUG: remove after push-delivery diagnosis.
  console.info('[TEMP-NOTIFICATION-DEBUG] device-register.persisted', {
    userId: input.userId,
    role: input.role,
    platform: input.platform,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  });
}

export async function unregisterNotificationDevice(input: {
  schoolId: string;
  userId: string;
  token: string;
}) {
  const result = await DeviceTokenModel.updateOne(
    {
      schoolId: input.schoolId,
      userId: input.userId,
      tokenHash: hashDeviceToken(input.token),
      status: 'active',
    },
    { $set: { status: 'revoked', revokedAt: new Date() } },
  );
  if (!result.matchedCount) {
    throw new ApiError(404, 'DEVICE_TOKEN_NOT_FOUND', 'The registered device was not found.');
  }
}
