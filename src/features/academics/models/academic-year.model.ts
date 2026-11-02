import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const academicYearSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  label: { type: String, required: true, trim: true },
  startsOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endsOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: {
    type: String,
    enum: ['planned', 'current', 'archived'],
    default: 'planned',
    required: true,
  },
}, {
  ...tenantSchemaOptions,
  collection: 'academic_years',
});

academicYearSchema.index({ schoolId: 1, label: 1 }, { unique: true });
academicYearSchema.index({ schoolId: 1, status: 1 });

export type AcademicYear = InferSchemaType<typeof academicYearSchema>;
export const AcademicYearModel = models.AcademicYear
  ?? model('AcademicYear', academicYearSchema);
