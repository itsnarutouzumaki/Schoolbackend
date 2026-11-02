import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const classSectionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  className: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    required: true,
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
