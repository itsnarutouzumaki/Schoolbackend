import { Types } from 'mongoose';
import { AcademicYearModel, ClassSectionModel, SubjectAssignmentModel } from '../../academics/models/index.js';
import { SchoolModel } from '../../tenant/models/index.js';
import { TeacherModel } from '../../people/models/index.js';
import { ApiError } from '../../../shared/errors/index.js';

export function getSchoolLocalDate(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new ApiError(500, 'SCHOOL_TIMEZONE_INVALID', 'The school timezone could not be resolved.', true);
  }
  return `${year}-${month}-${day}`;
}

export async function getTeacherDataContext(input: { schoolId: string; userId: string }) {
  const schoolId = new Types.ObjectId(input.schoolId);
  const [teacher, school] = await Promise.all([
    TeacherModel.findOne().where({ schoolId, userId: input.userId, status: 'active' })
      .select('_id displayName designation subjects qualifications experienceYears specialization biography languages photoFileId')
      .lean(),
    SchoolModel.findById(schoolId).select('currentAcademicYearId timezone').lean(),
  ]);

  if (!teacher) {
    throw new ApiError(403, 'TEACHER_PROFILE_UNAVAILABLE', 'The teacher profile is not available.');
  }

  const academicYear = school?.currentAcademicYearId
    ? await AcademicYearModel.findOne().where({
      _id: school.currentAcademicYearId,
      schoolId,
      status: 'current',
    }).select('_id label').lean()
    : null;

  return { schoolId, teacher, academicYear, timeZone: school?.timezone ?? 'UTC' };
}

export async function getTeacherAssignedSections(input: {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  timeZone: string;
}) {
  const today = getSchoolLocalDate(input.timeZone);
  const assignments = await SubjectAssignmentModel.find().where({
    schoolId: input.schoolId,
    teacherId: input.teacherId,
    academicYearId: input.academicYearId,
    active: true,
    $and: [
      { $or: [{ startsOn: { $exists: false } }, { startsOn: { $lte: today } }] },
      { $or: [{ endsOn: { $exists: false } }, { endsOn: { $gte: today } }] },
    ],
  }).select('classSectionId subjectId').lean();

  const assignedSectionIds = assignments.map(assignment => assignment.classSectionId);
  const sections = await ClassSectionModel.find().where({
    schoolId: input.schoolId,
    academicYearId: input.academicYearId,
    status: 'active',
    $or: [
      { _id: { $in: assignedSectionIds } },
      { classTeacherId: input.teacherId },
    ],
  }).select('_id academicYearId className section').sort({ className: 1, section: 1 }).lean();

  return { assignments, sections };
}

export async function teacherCanAccessSection(input: {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  classSectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  timeZone: string;
}) {
  const today = getSchoolLocalDate(input.timeZone);
  const [section, assignment] = await Promise.all([
    ClassSectionModel.findOne().where({
      _id: input.classSectionId,
      schoolId: input.schoolId,
      academicYearId: input.academicYearId,
      status: 'active',
    }).select('_id academicYearId className section classTeacherId').lean(),
    SubjectAssignmentModel.exists({
      schoolId: input.schoolId,
      classSectionId: input.classSectionId,
      teacherId: input.teacherId,
      academicYearId: input.academicYearId,
      active: true,
      $and: [
        { $or: [{ startsOn: { $exists: false } }, { startsOn: { $lte: today } }] },
        { $or: [{ endsOn: { $exists: false } }, { endsOn: { $gte: today } }] },
      ],
    }),
  ]);

  return section && (section.classTeacherId?.equals(input.teacherId) || Boolean(assignment))
    ? section
    : null;
}
