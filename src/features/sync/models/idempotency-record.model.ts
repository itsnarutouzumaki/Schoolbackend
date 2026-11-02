import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const idempotencyRecordSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  operation: { type: String, required: true, trim: true },
  idempotencyKey: { type: String, required: true, trim: true },
  requestHash: { type: String, required: true, select: false },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    required: true,
  },
  responseStatus: { type: Number, min: 100, max: 599, default: undefined },
  resultResourceType: { type: String, trim: true, default: undefined },
  resultResourceId: { type: Schema.Types.ObjectId, default: undefined },
  expiresAt: { type: Date, required: true },
}, {
  ...tenantSchemaOptions,
  collection: 'idempotency_records',
});

idempotencyRecordSchema.index(
  { schoolId: 1, userId: 1, operation: 1, idempotencyKey: 1 },
  { unique: true },
);
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IdempotencyRecord = InferSchemaType<typeof idempotencyRecordSchema>;
export const IdempotencyRecordModel = models.IdempotencyRecord
  ?? model('IdempotencyRecord', idempotencyRecordSchema);
