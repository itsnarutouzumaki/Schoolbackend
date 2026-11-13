import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const attendanceEntrySchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  attendanceSessionId: {
    type: Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: [true, "Attendance session ID is required."],
  },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, "Student ID is required."] },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: [true, "Class section ID is required."] },
  date: { type: String, required: [true, "Date is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."] },
  status: {
    type: String,
    enum: { values: ['present', 'absent', 'holiday', 'noClass'], message: "Status must be a valid option." },
    required: [true, "Status is required."],
  },
  note: { type: String, trim: true, maxlength: [500, "Note must be 500 characters or fewer."], default: undefined },
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
