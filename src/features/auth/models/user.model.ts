import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const userSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  role: {
    type: String,
    enum: ['guardian', 'teacher', 'schoolAdmin'],
    required: true,
  },
  status: {
    type: String,
    enum: ['invited', 'active', 'disabled', 'locked'],
    default: 'active',
    required: true,
  },
  normalizedPhone: { type: String, required: true, trim: true },
  normalizedEmail: { type: String, lowercase: true, trim: true, default: undefined },
  passwordHash: { type: String, required: true, select: false },
  mustChangePassword: { type: Boolean, default: false, required: true },
  phoneVerifiedAt: { type: Date, default: undefined },
  emailVerifiedAt: { type: Date, default: undefined },
  authVersion: { type: Number, min: 0, default: 0, required: true },
  profileId: { type: Schema.Types.ObjectId, default: undefined },
  failedLoginCount: { type: Number, min: 0, default: 0, select: false },
  lockedUntil: { type: Date, default: undefined, select: false },
  passwordChangedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'users',
});

userSchema.index(
  { schoolId: 1, normalizedPhone: 1, role: 1 },
  { unique: true },
);
userSchema.index({ schoolId: 1, status: 1, role: 1 });
userSchema.index({ schoolId: 1, profileId: 1 }, { sparse: true });

export type User = {
  schoolId: Types.ObjectId;
  role: 'guardian' | 'teacher' | 'schoolAdmin';
  status: 'invited' | 'active' | 'disabled' | 'locked';
  normalizedPhone: string;
  normalizedEmail?: string;
  passwordHash: string;
  mustChangePassword: boolean;
  phoneVerifiedAt?: Date;
  emailVerifiedAt?: Date;
  authVersion: number;
  profileId?: Types.ObjectId;
  failedLoginCount?: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
};
export const UserModel = getTypedModel<User>('User', userSchema);
