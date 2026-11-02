import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const schoolAdminProfileSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true,
  },
  title: { type: String, trim: true, default: undefined },
  department: { type: String, trim: true, default: undefined },
  workPhone: { type: String, trim: true, default: undefined, select: false },
  workEmail: { type: String, lowercase: true, trim: true, default: undefined, select: false },
  photoFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
  employmentStartDate: { type: Date, default: undefined, select: false },
  employmentEndDate: { type: Date, default: undefined, select: false },
}, {
  ...tenantSchemaOptions,
  collection: 'school_admin_profiles',
});

schoolAdminProfileSchema.index({ schoolId: 1, userId: 1 }, { unique: true });

export type SchoolAdminProfile = {
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
  displayName: string;
  status: 'active' | 'inactive';
  title?: string;
  department?: string;
  photoFileId?: Types.ObjectId;
};
export const SchoolAdminProfileModel = getTypedModel<SchoolAdminProfile>(
  'SchoolAdminProfile',
  schoolAdminProfileSchema,
);
