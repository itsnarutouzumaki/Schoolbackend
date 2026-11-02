import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const subjectSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, uppercase: true, trim: true, default: undefined },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true,
  },
}, {
  ...tenantSchemaOptions,
  collection: 'subjects',
});

subjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });
subjectSchema.index(
  { schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string' } } },
);

export type Subject = InferSchemaType<typeof subjectSchema>;
export const SubjectModel = models.Subject ?? model('Subject', subjectSchema);
