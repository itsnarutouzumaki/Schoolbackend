import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const classSectionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: [true, "Academic year ID is required."] },
  className: { type: String, required: [true, "Class name is required."], trim: true },
  section: { type: String, required: [true, "Section is required."], trim: true },
  status: {
    type: String,
    enum: { values: ['active', 'inactive', 'archived'], message: "Status must be a valid option." },
    default: 'active',
    required: [true, "Status is required."],
  },
  classTeacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'class_sections',
});

classSectionSchema.index(
  { schoolId: 1, academicYearId: 1, className: 1, section: 1 },
  { unique: true },
);
classSectionSchema.index({ schoolId: 1, classTeacherId: 1, academicYearId: 1 });

export type ClassSection = InferSchemaType<typeof classSectionSchema>;
export const ClassSectionModel = models.ClassSection
  ?? model('ClassSection', classSectionSchema);
