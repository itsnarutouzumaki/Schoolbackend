import { model, models, Schema, Types, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { ApiError } from '../../../shared/errors/index.js';
import { SchoolModel } from '../../tenant/models/index.js';
import { addressSchema, emergencyContactSchema } from './profile-subdocuments.js';
import { normalizeStudentNumber, studentNumberFromSequence } from '../student-number.js';

const sensitiveSupportSchema = new Schema({
  medicalNotes: { type: String, trim: true, default: undefined },
  accessibilityNotes: { type: String, trim: true, default: undefined },
}, { _id: false, strict: 'throw' });

const studentSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  studentNumber: { type: String, required: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'withdrawn'],
    default: 'active',
    required: true,
  },
  admissionNumber: { type: String, trim: true, default: undefined },
  dateOfBirth: { type: Date, default: undefined, select: false },
  gender: { type: String, trim: true, default: undefined, select: false },
  photoFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
  classSectionId: { type: Schema.Types.ObjectId, ref: 'ClassSection', default: undefined },
  rollNumber: { type: String, trim: true, default: undefined },
  currentAddress: { type: addressSchema, default: undefined, select: false },
  permanentAddress: { type: addressSchema, default: undefined, select: false },
  emergencyContacts: {
    type: [emergencyContactSchema],
    default: undefined,
    select: false,
  },
  enrollment: {
    admissionDate: { type: Date, default: undefined },
    priorSchool: { type: String, trim: true, default: undefined },
    transportAssignment: { type: String, trim: true, default: undefined },
  },
  sensitiveSupport: { type: sensitiveSupportSchema, default: undefined, select: false },
  optionalDetails: {
    type: Map,
    of: Schema.Types.Mixed,
    default: undefined,
    select: false,
    validate: {
      validator: (value: Map<string, unknown> | undefined) => !value || value.size <= 50,
      message: 'A student profile supports at most 50 optional detail fields.',
    },
  },
}, {
  ...tenantSchemaOptions,
  collection: 'students',
});

type StudentNumberFields = {
  schoolId: Types.ObjectId;
  studentNumber: string;
};

studentSchema.pre('validate', async function assignStudentNumber(
  this: HydratedDocument<StudentNumberFields>,
) {
  if (this.studentNumber) {
    this.studentNumber = normalizeStudentNumber(this.studentNumber);
    return;
  }
  if (!this.isNew) {
    return;
  }

  const schoolId = this.schoolId;
  const session = this.$session();
  while (true) {
    const counterUpdate = SchoolModel.findOneAndUpdate(
      { _id: schoolId },
      { $inc: { studentNumberSequence: 1 } },
      { returnDocument: 'after' },
    ).select('studentNumberSequence').lean();
    if (session) {
      counterUpdate.session(session);
    }

    const school = await counterUpdate;
    if (!school) {
      throw new ApiError(404, 'STUDENT_SCHOOL_NOT_FOUND', 'The student school was not found.');
    }

    const studentNumber = studentNumberFromSequence(school.studentNumberSequence);
    const existingQuery = StudentModel.exists({ schoolId, studentNumber });
    if (session) {
      existingQuery.session(session);
    }
    if (!await existingQuery) {
      this.studentNumber = studentNumber;
      return;
    }
  }
});

studentSchema.index({ schoolId: 1, studentNumber: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, classSectionId: 1, rollNumber: 1 });
studentSchema.index({ schoolId: 1, status: 1, displayName: 1 });

export type Student = InferSchemaType<typeof studentSchema>;
export const StudentModel = models.Student ?? model('Student', studentSchema);
