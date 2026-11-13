import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const assessmentSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: [true, "Class section ID is required."] },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: [true, "Subject ID is required."] },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: [true, "Academic year ID is required."] },
  teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: [true, "Teacher ID is required."] },
  type: {
    type: String,
    enum: { values: ['test', 'yearly', 'halfYearly', 'preBoard', 'other'], message: "Type must be a valid option." },
    required: [true, "Type is required."],
  },
  title: { type: String, required: [true, "Title is required."], trim: true },
  date: { type: String, required: [true, "Date is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."] },
  status: {
    type: String,
    enum: { values: ['draft', 'published', 'archived'], message: "Status must be a valid option." },
    default: 'draft',
    required: [true, "Status is required."],
  },
  revision: { type: Number, min: [1, "Revision must be at least 1."], default: 1, required: [true, "Revision is required."] },
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
