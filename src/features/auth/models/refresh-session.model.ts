import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const refreshSessionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "User ID is required."] },
  authVersion: { type: Number, required: [true, "Auth version is required."], min: [0, "Auth version must be at least 0."] },
  appAudience: { type: String, enum: { values: ['guardian', 'teacher', 'schoolAdmin'], message: "App audience must be a valid option." }, required: [true, "App audience is required."] },
  tokenHash: { type: String, required: [true, "Token hash is required."], select: false },
  deviceId: { type: String, trim: true, default: undefined },
  deviceName: { type: String, trim: true, default: undefined },
  platform: { type: String, enum: { values: ['android', 'ios', 'other'], message: "Platform must be a valid option." }, default: 'other' },
  expiresAt: { type: Date, required: [true, "Expires at is required."] },
  rotatedAt: { type: Date, default: undefined },
  revokedAt: { type: Date, default: undefined },
  revokeReason: {
    type: String,
    enum: { values: ['logout', 'password-reset', 'password-change', 'account-disabled', 'school-blocked', 'rotation'], message: "Revoke reason must be a valid option." },
    default: undefined,
  },
}, {
  ...tenantSchemaOptions,
  collection: 'refresh_sessions',
});

refreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshSessionSchema.index({ schoolId: 1, userId: 1, revokedAt: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshSession = {
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
  authVersion: number;
  appAudience: 'guardian' | 'teacher' | 'schoolAdmin';
  tokenHash: string;
  deviceId?: string;
  deviceName?: string;
  platform: 'android' | 'ios' | 'other';
  expiresAt: Date;
  rotatedAt?: Date;
  revokedAt?: Date;
  revokeReason?: 'logout' | 'password-reset' | 'password-change' | 'account-disabled' | 'school-blocked' | 'rotation';
};
export const RefreshSessionModel = getTypedModel<RefreshSession>('RefreshSession', refreshSessionSchema);
