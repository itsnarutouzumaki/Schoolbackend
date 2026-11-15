import { Types } from 'mongoose';
import { StudentModel } from '../../people/models/index.js';
import { getProfilePhotoUrls } from '../../files/services/index.js';
import { ApiError } from '../../../shared/errors/index.js';
import { compactStudentNumber } from '../../people/student-number.js';
import { getTeacherDataContext, teacherCanAccessSection } from './teacher-access.js';

export async function getTeacherClassStudents(input: {
  schoolId: string;
  userId: string;
  classSectionId: string;
}) {
  if (!Types.ObjectId.isValid(input.classSectionId)) {
    throw new ApiError(400, 'CLASS_SECTION_ID_INVALID', 'A valid class-section ID is required.');
  }
  const context = await getTeacherDataContext(input);
  if (!context.academicYear) {
    throw new ApiError(404, 'CLASS_SECTION_NOT_FOUND', 'The class section was not found.');
  }

  const sectionId = new Types.ObjectId(input.classSectionId);
  const section = await teacherCanAccessSection({
    schoolId: context.schoolId,
    teacherId: context.teacher._id,
    classSectionId: sectionId,
    academicYearId: context.academicYear._id,
    timeZone: context.timeZone,
  });
  if (!section) {
    throw new ApiError(404, 'CLASS_SECTION_NOT_FOUND', 'The class section was not found.');
  }

  const students = await StudentModel.find().where({
    schoolId: context.schoolId,
    classSectionId: sectionId,
    status: 'active',
  }).select('_id studentNumber displayName rollNumber photoFileId')
    .sort({ rollNumber: 1, studentNumber: 1 })
    .lean();
  const photoUrls = await getProfilePhotoUrls(
    input.schoolId,
    students.map(student => student.photoFileId),
  );

  return {
    classSection: {
      id: section._id.toString(),
      className: section.className,
      section: section.section,
    },
    students: students.map(student => ({
      id: student._id.toString(),
      studentNumber: compactStudentNumber(student.studentNumber),
      fullName: student.displayName,
      rollNumber: student.rollNumber,
      photoUrl: student.photoFileId
        ? photoUrls.get(student.photoFileId.toString())
        : undefined,
    })),
  };
}
