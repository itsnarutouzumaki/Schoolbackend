import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const assessmentResultSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  obtainedMarks: { type: Number, required: true, min: 0 },
  maxMarks: { type: Number, required: true, min: Number.EPSILON },
  remarks: { type: String, trim: true, maxlength: 2000, default: undefined },
  answerCopyFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
  answerCopyPageCount: { type: Number, min: 1, default: undefined },
  revision: { type: Number, min: 1, default: 1, required: true },
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
