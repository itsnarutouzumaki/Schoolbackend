import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const refreshSessionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authVersion: { type: Number, required: true, min: 0 },
  appAudience: { type: String, enum: ['guardian', 'teacher', 'schoolAdmin'], required: true },
  tokenHash: { type: String, required: true, select: false },
  deviceId: { type: String, trim: true, default: undefined },
  deviceName: { type: String, trim: true, default: undefined },
  platform: { type: String, enum: ['android', 'ios', 'other'], default: 'other' },
  expiresAt: { type: Date, required: true },
  rotatedAt: { type: Date, default: undefined },
  revokedAt: { type: Date, default: undefined },
  revokeReason: {
    type: String,
    enum: ['logout', 'password-reset', 'password-change', 'account-disabled', 'school-blocked', 'rotation'],
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
