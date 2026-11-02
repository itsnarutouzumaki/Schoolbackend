import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const subjectAssignmentSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  startsOn: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, default: undefined },
  endsOn: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, default: undefined },
  active: { type: Boolean, default: true, required: true },
}, {
  ...tenantSchemaOptions,
  collection: 'subject_assignments',
});

subjectAssignmentSchema.index(
  { schoolId: 1, classSectionId: 1, subjectId: 1, teacherId: 1, academicYearId: 1 },
  { unique: true },
);
subjectAssignmentSchema.index({ schoolId: 1, teacherId: 1, academicYearId: 1, active: 1 });
subjectAssignmentSchema.index({ schoolId: 1, classSectionId: 1, active: 1 });

export type SubjectAssignment = InferSchemaType<typeof subjectAssignmentSchema>;
export const SubjectAssignmentModel = models.SubjectAssignment
  ?? model('SubjectAssignment', subjectAssignmentSchema);
