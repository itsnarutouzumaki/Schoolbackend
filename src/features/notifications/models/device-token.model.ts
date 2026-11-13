import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const deviceTokenSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "User ID is required."] },
  appAudience: { type: String, enum: { values: ['guardian', 'teacher'], message: "App audience must be a valid option." }, required: [true, "App audience is required."] },
  platform: { type: String, enum: { values: ['android', 'ios'], message: "Platform must be a valid option." }, required: [true, "Platform is required."] },
  encryptedToken: { type: String, required: [true, "Encrypted token is required."], select: false },
  tokenHash: { type: String, required: [true, "Token hash is required."], select: false },
  deviceId: { type: String, trim: true, default: undefined },
  status: {
    type: String,
    enum: { values: ['active', 'revoked'], message: "Status must be a valid option." },
    default: 'active',
    required: [true, "Status is required."],
  },
  lastSeenAt: { type: Date, required: [true, "Last seen at is required."], default: Date.now },
  revokedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'device_tokens',
});

deviceTokenSchema.index({ schoolId: 1, tokenHash: 1 }, { unique: true });
deviceTokenSchema.index({ schoolId: 1, userId: 1, status: 1, appAudience: 1 });

export type DeviceToken = InferSchemaType<typeof deviceTokenSchema>;
export const DeviceTokenModel = models.DeviceToken
  ?? model('DeviceToken', deviceTokenSchema);
