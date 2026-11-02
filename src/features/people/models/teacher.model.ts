import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';
import { addressSchema, emergencyContactSchema } from './profile-subdocuments.js';

const privateContactSchema = new Schema({
  phone: { type: String, trim: true, default: undefined },
  email: { type: String, lowercase: true, trim: true, default: undefined },
  currentAddress: { type: addressSchema, default: undefined },
  permanentAddress: { type: addressSchema, default: undefined },
  emergencyContacts: { type: [emergencyContactSchema], default: undefined },
}, { _id: false, strict: 'throw' });

const employmentSchema = new Schema({
  staffNumber: { type: String, trim: true, default: undefined },
  startDate: { type: Date, default: undefined },
  endDate: { type: Date, default: undefined },
  certifications: { type: [String], default: undefined },
}, { _id: false, strict: 'throw' });

const teacherSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'left'],
    default: 'active',
    required: true,
  },
  designation: { type: String, trim: true, default: undefined },
  subjects: { type: [String], default: undefined },
  qualifications: { type: [String], default: undefined },
  experienceYears: { type: Number, min: 0, default: undefined },
  specialization: { type: String, trim: true, default: undefined },
  biography: { type: String, trim: true, default: undefined },
  languages: { type: [String], default: undefined },
  photoFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
  privateContact: { type: privateContactSchema, default: undefined, select: false },
  employment: { type: employmentSchema, default: undefined, select: false },
  optionalDetails: {
    type: Map,
    of: Schema.Types.Mixed,
    default: undefined,
    select: false,
    validate: {
      validator: (value: Map<string, unknown> | undefined) => !value || value.size <= 50,
      message: 'A teacher profile supports at most 50 optional detail fields.',
    },
  },
}, {
  ...tenantSchemaOptions,
  collection: 'teachers',
});

teacherSchema.index({ schoolId: 1, userId: 1 }, { unique: true });
teacherSchema.index({ schoolId: 1, status: 1, displayName: 1 });

export type Teacher = {
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
  displayName: string;
  status: 'active' | 'inactive' | 'left';
  designation?: string;
  subjects?: string[];
  qualifications?: string[];
  experienceYears?: number;
  specialization?: string;
  biography?: string;
  languages?: string[];
  photoFileId?: Types.ObjectId;
};
export const TeacherModel = getTypedModel<Teacher>('Teacher', teacherSchema);
