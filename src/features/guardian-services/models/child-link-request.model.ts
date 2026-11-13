import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const childLinkRequestSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: [true, "Guardian ID is required."] },
  proposedStudentNumber: { type: String, required: [true, "Proposed student number is required."], trim: true },
  proposedStudentName: { type: String, trim: true, maxlength: [120, "Proposed student name must be 120 characters or fewer."], default: undefined },
  relationship: { type: String, required: [true, "Relationship is required."], trim: true },
  status: {
    type: String,
    enum: { values: ['pending', 'approved', 'denied', 'cancelled'], message: "Status must be a valid option." },
    default: 'pending',
    required: [true, "Status is required."],
  },
  matchCheckOutcome: {
    type: String,
    enum: { values: ['notChecked', 'matched', 'noMatch', 'manualReview'], message: "Match check outcome must be a valid option." },
    default: 'notChecked',
    required: [true, "Match check outcome is required."],
    select: false,
  },
  reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  reviewedAt: { type: Date, default: undefined },
  reviewNote: { type: String, trim: true, maxlength: [2000, "Review note must be 2000 characters or fewer."], default: undefined },
  statusHistory: [{
    status: {
      type: String,
      enum: { values: ['pending', 'approved', 'denied', 'cancelled'], message: "Status must be a valid option." },
      required: [true, "Status is required."],
    },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "Actor user ID is required."] },
    changedAt: { type: Date, required: [true, "Changed at is required."], default: Date.now },
    note: { type: String, trim: true, maxlength: [2000, "Note must be 2000 characters or fewer."], default: undefined },
  }],
}, {
  ...tenantSchemaOptions,
  collection: 'child_link_requests',
});

childLinkRequestSchema.index({ schoolId: 1, guardianId: 1, createdAt: -1 });
childLinkRequestSchema.index({ schoolId: 1, proposedStudentNumber: 1, status: 1 });

export type ChildLinkRequest = InferSchemaType<typeof childLinkRequestSchema>;
export const ChildLinkRequestModel = models.ChildLinkRequest
  ?? model('ChildLinkRequest', childLinkRequestSchema);
