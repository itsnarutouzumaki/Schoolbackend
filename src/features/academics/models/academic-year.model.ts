import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const academicYearSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  label: { type: String, required: [true, "Label is required."], trim: true },
  startsOn: { type: String, required: [true, "Starts on is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Starts on must use YYYY-MM-DD format."] },
  endsOn: { type: String, required: [true, "Ends on is required."], match: [/^\d{4}-\d{2}-\d{2}$/, "Ends on must use YYYY-MM-DD format."] },
  status: {
    type: String,
    enum: { values: ['planned', 'current', 'archived'], message: "Status must be a valid option." },
    default: 'planned',
    required: [true, "Status is required."],
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
