import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const assessmentSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
  type: {
    type: String,
    enum: ['test', 'yearly', 'halfYearly', 'preBoard', 'other'],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    required: true,
  },
  revision: { type: Number, min: 1, default: 1, required: true },
  clientSubmissionId: { type: String, trim: true, default: undefined },
  submittedAt: { type: Date, default: undefined },
  publishedAt: { type: Date, default: undefined },
  publishedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  archivedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'assessments',
});

assessmentSchema.index({
  schoolId: 1,
  classSectionId: 1,
  academicYearId: 1,
  date: -1,
  status: 1,
});
assessmentSchema.index(
  { schoolId: 1, teacherId: 1, clientSubmissionId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientSubmissionId: { $type: 'string' } },
  },
);

export type Assessment = InferSchemaType<typeof assessmentSchema>;
export const AssessmentModel = models.Assessment ?? model('Assessment', assessmentSchema);
