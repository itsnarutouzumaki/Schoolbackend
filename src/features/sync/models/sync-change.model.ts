import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const syncChangeSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  revision: { type: Number, min: 1, required: true },
  entityType: { type: String, required: true, trim: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  operation: { type: String, enum: ['upsert', 'delete'], required: true },
  visibleRoles: {
    type: [String],
    enum: ['guardian', 'teacher', 'schoolAdmin'],
    default: [],
  },
  recipientUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  projection: { type: Schema.Types.Mixed, default: undefined, select: false },
}, {
  ...tenantSchemaOptions,
  collection: 'sync_changes',
});

syncChangeSchema.index({ schoolId: 1, revision: 1 }, { unique: true });
syncChangeSchema.index({ schoolId: 1, entityType: 1, entityId: 1, revision: -1 });

export type SyncChange = InferSchemaType<typeof syncChangeSchema>;
export const SyncChangeModel = models.SyncChange ?? model('SyncChange', syncChangeSchema);
