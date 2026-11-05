import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const childLinkRequestSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
  proposedStudentNumber: { type: String, required: true, trim: true },
  proposedStudentName: { type: String, trim: true, maxlength: 120, default: undefined },
  relationship: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'cancelled'],
    default: 'pending',
    required: true,
  },
  matchCheckOutcome: {
    type: String,
    enum: ['notChecked', 'matched', 'noMatch', 'manualReview'],
    default: 'notChecked',
    required: true,
    select: false,
  },
  reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  reviewedAt: { type: Date, default: undefined },
  reviewNote: { type: String, trim: true, maxlength: 2000, default: undefined },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'cancelled'],
      required: true,
    },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, maxlength: 2000, default: undefined },
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
