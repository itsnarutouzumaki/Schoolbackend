import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const childLinkSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: [true, "Guardian ID is required."] },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, "Student ID is required."] },
  relationship: { type: String, required: [true, "Relationship is required."], trim: true },
  status: {
    type: String,
    enum: { values: ['pending', 'approved', 'denied', 'revoked'], message: "Status must be a valid option." },
    default: 'pending',
    required: [true, "Status is required."],
  },
  requestedAt: { type: Date, required: [true, "Requested at is required."], default: Date.now },
  reviewedAt: { type: Date, default: undefined },
  reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  reviewNote: { type: String, trim: true, default: undefined },
  revokedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'guardian_student_links',
});

childLinkSchema.index({ schoolId: 1, guardianId: 1, studentId: 1 }, { unique: true });
childLinkSchema.index({ schoolId: 1, guardianId: 1, status: 1 });
childLinkSchema.index({ schoolId: 1, studentId: 1, status: 1 });

export type ChildLink = InferSchemaType<typeof childLinkSchema>;
export const ChildLinkModel = models.ChildLink ?? model('ChildLink', childLinkSchema);
