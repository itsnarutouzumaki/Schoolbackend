import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const subjectSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  name: { type: String, required: [true, "Name is required."], trim: true },
  code: { type: String, uppercase: true, trim: true, default: undefined },
  status: {
    type: String,
    enum: { values: ['active', 'inactive'], message: "Status must be a valid option." },
    default: 'active',
    required: [true, "Status is required."],
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
