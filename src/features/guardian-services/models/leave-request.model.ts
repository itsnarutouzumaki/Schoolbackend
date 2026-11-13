import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const requestStatusChangeSchema = new Schema({
  status: {
    type: String,
    enum: { values: ['pending', 'approved', 'denied', 'cancelled'], message: "Status must be a valid option." },
    required: [true, "Status is required."],
  },
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "Actor user ID is required."] },
  note: { type: String, trim: true, maxlength: [2000, "Note must be 2000 characters or fewer."], default: undefined },
  changedAt: { type: Date, required: [true, "Changed at is required."], default: Date.now },
}, { _id: false, strict: 'throw' });

const leaveRequestSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: [true, "Guardian ID is required."] },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, "Student ID is required."] },
  startsOn: { type: String, required: [true, "Starts on is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Starts on must use YYYY-MM-DD format."] },
  endsOn: { type: String, required: [true, "Ends on is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Ends on must use YYYY-MM-DD format."] },
  reason: { type: String, required: [true, "Reason is required."], trim: true, maxlength: [4000, "Reason must be 4000 characters or fewer."] },
  status: {
    type: String,
    enum: { values: ['pending', 'approved', 'denied', 'cancelled'], message: "Status must be a valid option." },
    default: 'pending',
    required: [true, "Status is required."],
  },
  statusHistory: { type: [requestStatusChangeSchema], default: [] },
  reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  reviewNote: { type: String, trim: true, maxlength: [2000, "Review note must be 2000 characters or fewer."], default: undefined },
  fileIds: [{ type: Schema.Types.ObjectId, ref: 'FileRecord' }],
}, {
  ...tenantSchemaOptions,
  collection: 'leave_requests',
});

leaveRequestSchema.index({ schoolId: 1, guardianId: 1, createdAt: -1 });
leaveRequestSchema.index({ schoolId: 1, studentId: 1, status: 1, startsOn: -1 });

export type LeaveRequest = InferSchemaType<typeof leaveRequestSchema>;
export const LeaveRequestModel = models.LeaveRequest
  ?? model('LeaveRequest', leaveRequestSchema);
