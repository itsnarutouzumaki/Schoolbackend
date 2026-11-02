import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const attendanceSessionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  submittedByTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'locked'],
    default: 'submitted',
    required: true,
  },
  counts: {
    present: { type: Number, min: 0, default: 0 },
    absent: { type: Number, min: 0, default: 0 },
    holiday: { type: Number, min: 0, default: 0 },
    noClass: { type: Number, min: 0, default: 0 },
  },
  revision: { type: Number, min: 1, default: 1, required: true },
  clientSubmissionId: { type: String, required: true, trim: true },
  submittedAt: { type: Date, default: Date.now },
  lockedAt: { type: Date, default: undefined },
  lastChangedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'attendance_sessions',
});

attendanceSessionSchema.index(
  { schoolId: 1, classSectionId: 1, date: 1 },
  { unique: true },
);
attendanceSessionSchema.index({ schoolId: 1, submittedByTeacherId: 1, date: -1 });
attendanceSessionSchema.index(
  { schoolId: 1, submittedByTeacherId: 1, clientSubmissionId: 1 },
  { unique: true },
);

export type AttendanceSession = InferSchemaType<typeof attendanceSessionSchema>;
export const AttendanceSessionModel = models.AttendanceSession
  ?? model('AttendanceSession', attendanceSessionSchema);
