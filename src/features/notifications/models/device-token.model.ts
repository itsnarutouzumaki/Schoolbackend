import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const deviceTokenSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  appAudience: { type: String, enum: ['guardian', 'teacher'], required: true },
  platform: { type: String, enum: ['android', 'ios'], required: true },
  encryptedToken: { type: String, required: true, select: false },
  tokenHash: { type: String, required: true, select: false },
  deviceId: { type: String, trim: true, default: undefined },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active',
    required: true,
  },
  lastSeenAt: { type: Date, required: true, default: Date.now },
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
