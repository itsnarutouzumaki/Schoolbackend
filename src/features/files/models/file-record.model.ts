import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const fileRecordSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  fileCode: { type: String, required: [true, "File code is required."], immutable: true, trim: true },
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "Owner user ID is required."] },
  purpose: {
    type: String,
    enum: { values: ['answer-copy', 'complaint-attachment', 'leave-attachment', 'profile-photo', 'school-branding'], message: "Purpose must be a valid option." },
    required: [true, "Purpose is required."],
  },
  relatedEntityType: {
    type: String,
    enum: { values: ['assessmentResult', 'complaint', 'leaveRequest', 'guardian', 'student', 'teacher', 'school', 'other'], message: "Related entity type must be a valid option." },
    default: undefined,
  },
  relatedEntityId: { type: Schema.Types.ObjectId, default: undefined },
  storageProvider: { type: String, enum: { values: ['gcs'], message: "Storage provider must be a valid option." }, required: [true, "Storage provider is required."], default: 'gcs' },
  storageRef: { type: String, required: [true, "Storage ref is required."], select: false },
  storageGeneration: { type: String, default: undefined, select: false },
  originalFileName: { type: String, required: [true, "Original file name is required."], trim: true, maxlength: [255, "Original file name must be 255 characters or fewer."] },
  contentType: { type: String, required: [true, "Content type is required."], trim: true, lowercase: true },
  sizeBytes: { type: Number, required: [true, "Size bytes is required."], min: [1, "Size bytes must be at least 1."] },
  crc32c: {
    type: String,
    default: undefined,
  },
  status: {
    type: String,
    enum: { values: ['pending', 'ready', 'deleted'], message: "Status must be a valid option." },
    default: 'pending',
    required: [true, "Status is required."],
  },
  scanStatus: {
    type: String,
    enum: { values: ['not-scanned'], message: "Scan status must be a valid option." },
    default: 'not-scanned',
    required: [true, "Scan status is required."],
  },
  uploadExpiresAt: { type: Date, default: undefined },
  readyAt: { type: Date, default: undefined },
  retentionDays: { type: Number, min: [1, "Retention days must be at least 1."], validate: { validator: Number.isInteger, message: "Retention days must be a whole number." }, required: [true, "Retention days is required."] },
  retentionDeleteAt: { type: Date, default: undefined },
  deletedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'files',
});

fileRecordSchema.index({ schoolId: 1, fileCode: 1 }, { unique: true });
fileRecordSchema.index({ schoolId: 1, relatedEntityType: 1, relatedEntityId: 1 });
fileRecordSchema.index({ schoolId: 1, ownerUserId: 1, createdAt: -1 });
fileRecordSchema.index({ status: 1, uploadExpiresAt: 1 });
fileRecordSchema.index({ status: 1, retentionDeleteAt: 1 });

export type FileRecord = {
  schoolId: Types.ObjectId;
  fileCode: string;
  ownerUserId: Types.ObjectId;
  purpose: 'answer-copy' | 'complaint-attachment' | 'leave-attachment' | 'profile-photo' | 'school-branding';
  relatedEntityType?: 'assessmentResult' | 'complaint' | 'leaveRequest' | 'guardian' | 'student' | 'teacher' | 'school' | 'other';
  relatedEntityId?: Types.ObjectId;
  storageProvider: 'gcs';
  storageRef: string;
  storageGeneration?: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  crc32c?: string;
  status: 'pending' | 'ready' | 'deleted';
  scanStatus: 'not-scanned';
  uploadExpiresAt?: Date;
  readyAt?: Date;
  retentionDays: number;
  retentionDeleteAt?: Date;
  deletedAt?: Date;
};
export const FileRecordModel = getTypedModel<FileRecord>('FileRecord', fileRecordSchema);
