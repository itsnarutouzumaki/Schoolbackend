import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const schoolSchema = new Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9-]+$/,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  timezone: { type: String, required: true, default: 'Asia/Kolkata' },
  currentAcademicYearId: {
    type: Schema.Types.ObjectId,
    ref: 'AcademicYear',
    default: undefined,
  },
  fileRetentionDays: {
    type: Number,
    min: 1,
    validate: Number.isInteger,
    default: 30,
    required: true,
  },
  branding: {
    primaryColor: { type: String, default: undefined },
    accentColor: { type: String, default: undefined },
    logoFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
    contactEmail: { type: String, lowercase: true, trim: true, default: undefined },
    contactPhone: { type: String, trim: true, default: undefined },
    website: { type: String, trim: true, default: undefined },
  },
  dataRevision: { type: Number, min: 0, default: 0, required: true },
}, {
  ...tenantSchemaOptions,
  collection: 'schools',
});

schoolSchema.index({ code: 1 }, { unique: true });
schoolSchema.index({ status: 1 });

export type School = {
  code: string;
  status: 'active' | 'suspended' | 'closed';
  name: string;
  timezone: string;
  currentAcademicYearId?: Types.ObjectId;
  fileRetentionDays: number;
  dataRevision: number;
};
export const SchoolModel = getTypedModel<School>('School', schoolSchema);
