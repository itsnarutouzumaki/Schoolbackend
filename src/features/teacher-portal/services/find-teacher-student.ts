import { Types } from 'mongoose';
import { AcademicYearModel } from '../../academics/models/index.js';
import { StudentModel, compactStudentNumber, normalizeStudentNumber } from '../../people/models/index.js';
import { getProfilePhotoUrls } from '../../files/services/index.js';
import { ApiError } from '../../../shared/errors/index.js';
import { TeacherModel } from '../../people/models/index.js';
import { SchoolModel } from '../../tenant/models/index.js';
import { teacherCanAccessSection } from './teacher-access.js';

export async function findTeacherStudent(input: {
  schoolId: string;
  userId: string;
  studentNumber: string;
}) {
  const studentNumber = normalizeStudentNumber(input.studentNumber);
  const schoolId = new Types.ObjectId(input.schoolId);
  const [teacher, school, student] = await Promise.all([
    TeacherModel.findOne().where({ schoolId, userId: input.userId, status: 'active' }).select('_id').lean(),
    SchoolModel.findById(schoolId).select('currentAcademicYearId timezone').lean(),
    StudentModel.findOne().where({
      schoolId,
      studentNumber,
      status: 'active',
    }).select('_id studentNumber displayName rollNumber photoFileId classSectionId').lean(),
  ]);

  if (!teacher) {
    throw new ApiError(403, 'TEACHER_PROFILE_UNAVAILABLE', 'The teacher profile is not available.');
  }
  if (!school?.currentAcademicYearId || !student?.classSectionId) {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'The student was not found.');
  }
  const academicYear = await AcademicYearModel.findOne().where({
    _id: school.currentAcademicYearId,
    schoolId,
    status: 'current',
  }).select('_id').lean();
  if (!academicYear) {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'The student was not found.');
  }

  const section = await teacherCanAccessSection({
    schoolId,
    teacherId: teacher._id,
    classSectionId: student.classSectionId,
    academicYearId: academicYear._id,
    timeZone: school.timezone,
  });
  if (!section) {
    throw new ApiError(404, 'STUDENT_NOT_FOUND', 'The student was not found.');
  }

  const photoUrls = await getProfilePhotoUrls(input.schoolId, [student.photoFileId]);
  return {
    id: student._id.toString(),
    studentNumber: compactStudentNumber(student.studentNumber),
    fullName: student.displayName,
    rollNumber: student.rollNumber,
    photoUrl: student.photoFileId
      ? photoUrls.get(student.photoFileId.toString())
      : undefined,
    classSection: {
      id: section._id.toString(),
      className: section.className,
      section: section.section,
    },
  };
}
