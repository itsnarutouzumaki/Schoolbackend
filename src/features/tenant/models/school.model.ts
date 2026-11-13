import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const schoolSchema = new Schema({
  code: {
    type: String,
    required: [true, "Code is required."],
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9-]+$/, "Code has an invalid format."],
  },
  status: {
    type: String,
    enum: { values: ['active', 'suspended', 'closed'], message: "Status must be a valid option." },
    default: 'active',
    required: [true, "Status is required."],
  },
  name: { type: String, required: [true, "Name is required."], trim: true },
  timezone: { type: String, required: [true, "Timezone is required."], default: 'Asia/Kolkata' },
  currentAcademicYearId: {
    type: Schema.Types.ObjectId,
    ref: 'AcademicYear',
    default: undefined,
  },
  fileRetentionDays: {
    type: Number,
    min: [1, "File retention days must be at least 1."],
    validate: { validator: Number.isInteger, message: "File retention days must be a whole number." },
    default: 30,
    required: [true, "File retention days is required."],
  },
  branding: {
    primaryColor: { type: String, default: undefined },
    accentColor: { type: String, default: undefined },
    logoFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
    contactEmail: { type: String, lowercase: true, trim: true, default: undefined },
    contactPhone: { type: String, trim: true, default: undefined },
    website: { type: String, trim: true, default: undefined },
  },
  dataRevision: { type: Number, min: [0, "Data revision must be at least 0."], default: 0, required: [true, "Data revision is required."] },
  studentNumberSequence: {
    type: Number,
    min: [0, "Student number sequence must be at least 0."],
    validate: { validator: Number.isInteger, message: "Student number sequence must be a whole number." },
    default: 0,
    required: [true, "Student number sequence is required."],
  },
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
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    logoFileId?: Types.ObjectId;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
  };
  fileRetentionDays: number;
  dataRevision: number;
  studentNumberSequence: number;
};
export const SchoolModel = getTypedModel<School>('School', schoolSchema);
