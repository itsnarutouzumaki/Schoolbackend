import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const complaintSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "Sender user ID is required."] },
  senderRole: {
    type: String,
    enum: { values: ['guardian', 'teacher'], message: "Sender role must be a valid option." },
    required: [true, "Sender role is required."],
  },
  recipientRole: {
    type: String,
    enum: { values: ['teacher', 'guardian', 'schoolAdmin', 'student'], message: "Recipient role must be a valid option." },
    required: [true, "Recipient role is required."],
  },
  recipientUserIds: { type: String, required: [true, "Recipient ID is required."] },
  subject: { type: String, required: [true, "Subject is required."], trim: true, maxlength: [200, "Subject must be 200 characters or fewer."] },
  message: { type: String, required: [true, "Message is required."], trim: true, maxlength: [10000, "Message must be 10000 characters or fewer."] },
  status: {
    type: String,
    enum: { values: ['open', 'inProgress', 'resolved', 'closed'], message: "Status must be a valid option." },
    default: 'open',
    required: [true, "Status is required."],
  },
  attachmentFileIds: [{ type: Schema.Types.ObjectId, ref: 'FileRecord' }],
}, {
  ...tenantSchemaOptions,
  collection: 'complaints',
});

complaintSchema.index({ schoolId: 1, senderUserId: 1, createdAt: -1 });
complaintSchema.index({ schoolId: 1, recipientRole: 1, status: 1, createdAt: -1 });
complaintSchema.index({ schoolId: 1, status: 1, createdAt: -1 });

export type Complaint = InferSchemaType<typeof complaintSchema>;
export const ComplaintModel = models.Complaint ?? model('Complaint', complaintSchema);
