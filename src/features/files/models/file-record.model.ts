import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const fileRecordSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  fileCode: { type: String, required: true, immutable: true, trim: true },
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: {
    type: String,
    enum: ['answer-copy', 'complaint-attachment', 'leave-attachment', 'profile-photo', 'school-branding'],
    required: true,
  },
  relatedEntityType: {
    type: String,
    enum: ['assessmentResult', 'complaint', 'leaveRequest', 'guardian', 'student', 'teacher', 'school', 'other'],
    default: undefined,
  },
  relatedEntityId: { type: Schema.Types.ObjectId, default: undefined },
  storageProvider: { type: String, enum: ['gcs'], required: true, default: 'gcs' },
  storageRef: { type: String, required: true, select: false },
  storageGeneration: { type: String, default: undefined, select: false },
  originalFileName: { type: String, required: true, trim: true, maxlength: 255 },
  contentType: { type: String, required: true, trim: true, lowercase: true },
  sizeBytes: { type: Number, required: true, min: 1 },
  crc32c: {
    type: String,
    default: undefined,
  },
  status: {
    type: String,
    enum: ['pending', 'ready', 'deleted'],
    default: 'pending',
    required: true,
  },
  scanStatus: {
    type: String,
    enum: ['not-scanned'],
    default: 'not-scanned',
    required: true,
  },
  uploadExpiresAt: { type: Date, default: undefined },
  readyAt: { type: Date, default: undefined },
  retentionDays: { type: Number, min: 1, validate: Number.isInteger, required: true },
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
