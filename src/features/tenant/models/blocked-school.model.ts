import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const blockedSchoolSchema = new Schema({
  schoolCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9-]+$/,
  },
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: undefined },
  reasonInternal: { type: String, required: true, trim: true },
  blockedAt: { type: Date, required: true, default: Date.now },
  blockedByPlatformUserId: { type: Schema.Types.ObjectId, required: true },
  expiresAt: { type: Date, default: null },
}, {
  ...tenantSchemaOptions,
  collection: 'blocked_schools',
});

blockedSchoolSchema.index({ schoolCode:  1 }, { unique: true });

export type BlockedSchool = {
  schoolCode: string;
  schoolId?: Types.ObjectId;
  reasonInternal: string;
  blockedAt: Date;
  blockedByPlatformUserId: Types.ObjectId;
  expiresAt?: Date | null;
};
export const BlockedSchoolModel = getTypedModel<BlockedSchool>('BlockedSchool', blockedSchoolSchema);
