import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const assessmentResultSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: [true, "Assessment ID is required."] },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, "Student ID is required."] },
  obtainedMarks: { type: Number, required: [true, "Obtained marks is required."], min: [0, "Obtained marks must be at least 0."] },
  maxMarks: { type: Number, required: [true, "Max marks is required."], min: [Number.EPSILON, "Max marks must be at least greater than zero."] },
  remarks: { type: String, trim: true, maxlength: [2000, "Remarks must be 2000 characters or fewer."], default: undefined },
  answerCopyFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
  answerCopyPageCount: { type: Number, min: [1, "Answer copy page count must be at least 1."], default: undefined },
  revision: { type: Number, min: [1, "Revision must be at least 1."], default: 1, required: [true, "Revision is required."] },
}, {
  ...tenantSchemaOptions,
  collection: 'assessment_results',
});

assessmentResultSchema.pre('validate', function validateScoreRange() {
  const obtainedMarks = this.get('obtainedMarks');
  const maxMarks = this.get('maxMarks');

  if (
    typeof obtainedMarks === 'number'
    && typeof maxMarks === 'number'
    && obtainedMarks > maxMarks
  ) {
    this.invalidate('obtainedMarks', 'Obtained marks cannot exceed maximum marks.');
  }
});
assessmentResultSchema.index(
  { schoolId: 1, assessmentId: 1, studentId: 1 },
  { unique: true },
);
assessmentResultSchema.index({ schoolId: 1, studentId: 1, assessmentId: 1 });

export type AssessmentResult = InferSchemaType<typeof assessmentResultSchema>;
export const AssessmentResultModel = models.AssessmentResult
  ?? model('AssessmentResult', assessmentResultSchema);
