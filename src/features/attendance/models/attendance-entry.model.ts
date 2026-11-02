import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const attendanceEntrySchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  attendanceSessionId: {
    type: Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: true,
  },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: {
    type: String,
    enum: ['present', 'absent', 'holiday', 'noClass'],
    required: true,
  },
  note: { type: String, trim: true, maxlength: 500, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'attendance_entries',
});

attendanceEntrySchema.index(
  { schoolId: 1, attendanceSessionId: 1, studentId: 1 },
  { unique: true },
);
attendanceEntrySchema.index({ schoolId: 1, studentId: 1, date: -1 });

export type AttendanceEntry = InferSchemaType<typeof attendanceEntrySchema>;
export const AttendanceEntryModel = models.AttendanceEntry
  ?? model('AttendanceEntry', attendanceEntrySchema);
