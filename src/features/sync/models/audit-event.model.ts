import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const auditEventSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: undefined },
  actorType: {
    type: String,
    enum: { values: ['user', 'platformAdmin', 'system'], message: "Actor type must be a valid option." },
    required: [true, "Actor type is required."],
  },
  actorId: { type: Schema.Types.ObjectId, default: undefined },
  actorRole: {
    type: String,
    enum: { values: ['guardian', 'teacher', 'schoolAdmin', 'platformAdmin', 'system'], message: "Actor role must be a valid option." },
    required: [true, "Actor role is required."],
  },
  action: { type: String, required: [true, "Action is required."], trim: true },
  resourceType: { type: String, required: [true, "Resource type is required."], trim: true },
  resourceId: { type: Schema.Types.ObjectId, default: undefined },
  requestId: { type: String, required: [true, "Request ID is required."], trim: true },
  changeSummary: { type: Schema.Types.Mixed, default: undefined, select: false },
  ipAddress: { type: String, default: undefined, select: false },
  deviceInfo: { type: String, trim: true, maxlength: [500, "Device info must be 500 characters or fewer."], default: undefined, select: false },
  occurredAt: { type: Date, required: [true, "Occurred at is required."], default: Date.now, immutable: true },
}, {
  ...tenantSchemaOptions,
  collection: 'audit_events',
});

auditEventSchema.index({ schoolId: 1, createdAt: -1 });
auditEventSchema.index({ schoolId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });
auditEventSchema.index({ actorId: 1, createdAt: -1 });

export type AuditEvent = InferSchemaType<typeof auditEventSchema>;
export const AuditEventModel = models.AuditEvent ?? model('AuditEvent', auditEventSchema);
