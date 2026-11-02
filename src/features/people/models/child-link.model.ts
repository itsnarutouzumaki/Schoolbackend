import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const childLinkSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  relationship: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'revoked'],
    default: 'pending',
    required: true,
  },
  requestedAt: { type: Date, required: true, default: Date.now },
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
