import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const complaintStatusChangeSchema = new Schema({
  status: {
    type: String,
    enum: ['open', 'inProgress', 'resolved', 'closed'],
    required: true,
  },
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 2000, default: undefined },
  changedAt: { type: Date, required: true, default: Date.now },
}, { _id: false, strict: 'throw' });

const complaintSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 10000 },
  status: {
    type: String,
    enum: ['open', 'inProgress', 'resolved', 'closed'],
    default: 'open',
    required: true,
  },
  assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  statusHistory: { type: [complaintStatusChangeSchema], default: [] },
  attachmentFileIds: [{ type: Schema.Types.ObjectId, ref: 'FileRecord' }],
}, {
  ...tenantSchemaOptions,
  collection: 'complaints',
});

complaintSchema.index({ schoolId: 1, guardianId: 1, createdAt: -1 });
complaintSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
complaintSchema.index({ schoolId: 1, assignedToUserId: 1, status: 1 });

export type Complaint = InferSchemaType<typeof complaintSchema>;
export const ComplaintModel = models.Complaint ?? model('Complaint', complaintSchema);
