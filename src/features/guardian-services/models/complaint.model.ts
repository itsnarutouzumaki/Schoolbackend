import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const complaintStatusChangeSchema = new Schema({
  status: {
    type: String,
    enum: { values: ['open', 'inProgress', 'resolved', 'closed'], message: "Status must be a valid option." },
    required: [true, "Status is required."],
  },
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "Actor user ID is required."] },
  note: { type: String, trim: true, maxlength: [2000, "Note must be 2000 characters or fewer."], default: undefined },
  changedAt: { type: Date, required: [true, "Changed at is required."], default: Date.now },
}, { _id: false, strict: 'throw' });

const complaintSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: [true, "Guardian ID is required."] },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, "Student ID is required."] },
  subject: { type: String, required: [true, "Subject is required."], trim: true, maxlength: [200, "Subject must be 200 characters or fewer."] },
  message: { type: String, required: [true, "Message is required."], trim: true, maxlength: [10000, "Message must be 10000 characters or fewer."] },
  status: {
    type: String,
    enum: { values: ['open', 'inProgress', 'resolved', 'closed'], message: "Status must be a valid option." },
    default: 'open',
    required: [true, "Status is required."],
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
