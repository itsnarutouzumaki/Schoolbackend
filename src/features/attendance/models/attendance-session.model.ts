import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const attendanceSessionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: [true, "Class section ID is required."] },
  date: { type: String, required: [true, "Date is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."] },
  submittedByTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: [true, "Submitted by teacher ID is required."] },
  status: {
    type: String,
    enum: { values: ['draft', 'submitted', 'locked'], message: "Status must be a valid option." },
    default: 'submitted',
    required: [true, "Status is required."],
  },
  counts: {
    present: { type: Number, min: [0, "Present must be at least 0."], default: 0 },
    absent: { type: Number, min: [0, "Absent must be at least 0."], default: 0 },
    holiday: { type: Number, min: [0, "Holiday must be at least 0."], default: 0 },
    noClass: { type: Number, min: [0, "No class must be at least 0."], default: 0 },
  },
  revision: { type: Number, min: [1, "Revision must be at least 1."], default: 1, required: [true, "Revision is required."] },
  clientSubmissionId: { type: String, required: [true, "Client submission ID is required."], trim: true },
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
