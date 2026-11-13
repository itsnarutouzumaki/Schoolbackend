import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const idempotencyRecordSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "User ID is required."] },
  operation: { type: String, required: [true, "Operation is required."], trim: true },
  idempotencyKey: { type: String, required: [true, "Idempotency key is required."], trim: true },
  requestHash: { type: String, required: [true, "Request hash is required."], select: false },
  status: {
    type: String,
    enum: { values: ['processing', 'completed', 'failed'], message: "Status must be a valid option." },
    default: 'processing',
    required: [true, "Status is required."],
  },
  responseStatus: { type: Number, min: [100, "Response status must be at least 100."], max: [599, "Response status must be no more than 599."], default: undefined },
  resultResourceType: { type: String, trim: true, default: undefined },
  resultResourceId: { type: Schema.Types.ObjectId, default: undefined },
  expiresAt: { type: Date, required: [true, "Expires at is required."] },
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
