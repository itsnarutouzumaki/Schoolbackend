import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const syncChangeSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  revision: { type: Number, min: [1, "Revision must be at least 1."], required: [true, "Revision is required."] },
  entityType: { type: String, required: [true, "Entity type is required."], trim: true },
  entityId: { type: Schema.Types.ObjectId, required: [true, "Entity ID is required."] },
  operation: { type: String, enum: { values: ['upsert', 'delete'], message: "Operation must be a valid option." }, required: [true, "Operation is required."] },
  visibleRoles: {
    type: [String],
    enum: { values: ['guardian', 'teacher', 'schoolAdmin'], message: "Visible roles must be a valid option." },
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
