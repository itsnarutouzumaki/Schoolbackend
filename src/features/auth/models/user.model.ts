import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const userSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  role: {
    type: String,
    enum: { values: ['guardian', 'teacher', 'schoolAdmin'], message: "Role must be a valid option." },
    required: [true, "Role is required."],
  },
  status: {
    type: String,
    enum: { values: ['invited', 'active', 'disabled', 'locked'], message: "Status must be a valid option." },
    default: 'active',
    required: [true, "Status is required."],
  },
  normalizedPhone: { type: String, required: [true, "Normalized phone is required."], trim: true },
  normalizedEmail: { type: String, lowercase: true, trim: true, default: undefined },
  passwordHash: { type: String, required: [true, "Password hash is required."], select: false },
  mustChangePassword: { type: Boolean, default: false, required: [true, "Must change password is required."] },
  phoneVerifiedAt: { type: Date, default: undefined },
  emailVerifiedAt: { type: Date, default: undefined },
  authVersion: { type: Number, min: [0, "Auth version must be at least 0."], default: 0, required: [true, "Auth version is required."] },
  profileId: { type: Schema.Types.ObjectId, default: undefined },
  failedLoginCount: { type: Number, min: [0, "Failed login count must be at least 0."], default: 0, select: false },
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
