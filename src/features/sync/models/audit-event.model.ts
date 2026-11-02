import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const auditEventSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: undefined },
  actorType: {
    type: String,
    enum: ['user', 'platformAdmin', 'system'],
    required: true,
  },
  actorId: { type: Schema.Types.ObjectId, default: undefined },
  actorRole: {
    type: String,
    enum: ['guardian', 'teacher', 'schoolAdmin', 'platformAdmin', 'system'],
    required: true,
  },
  action: { type: String, required: true, trim: true },
  resourceType: { type: String, required: true, trim: true },
  resourceId: { type: Schema.Types.ObjectId, default: undefined },
  requestId: { type: String, required: true, trim: true },
  changeSummary: { type: Schema.Types.Mixed, default: undefined, select: false },
  ipAddress: { type: String, default: undefined, select: false },
  deviceInfo: { type: String, trim: true, maxlength: 500, default: undefined, select: false },
  occurredAt: { type: Date, required: true, default: Date.now, immutable: true },
}, {
  ...tenantSchemaOptions,
  collection: 'audit_events',
});

auditEventSchema.index({ schoolId: 1, createdAt: -1 });
auditEventSchema.index({ schoolId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });
auditEventSchema.index({ actorId: 1, createdAt: -1 });

export type AuditEvent = InferSchemaType<typeof auditEventSchema>;
export const AuditEventModel = models.AuditEvent ?? model('AuditEvent', auditEventSchema);
