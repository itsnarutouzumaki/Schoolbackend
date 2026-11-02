import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const requestStatusChangeSchema = new Schema({
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'cancelled'],
    required: true,
  },
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 2000, default: undefined },
  changedAt: { type: Date, required: true, default: Date.now },
}, { _id: false, strict: 'throw' });

const leaveRequestSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  startsOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endsOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  reason: { type: String, required: true, trim: true, maxlength: 4000 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'cancelled'],
    default: 'pending',
    required: true,
  },
  statusHistory: { type: [requestStatusChangeSchema], default: [] },
  reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  reviewNote: { type: String, trim: true, maxlength: 2000, default: undefined },
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
