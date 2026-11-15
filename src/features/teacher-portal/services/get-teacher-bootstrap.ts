import { SubjectModel } from '../../academics/models/index.js';
import { UserModel } from '../../auth/models/index.js';
import { getProfilePhotoUrls } from '../../files/services/index.js';
import { getTeacherAssignedSections, getTeacherDataContext } from './teacher-access.js';

export async function getTeacherBootstrap(input: { schoolId: string; userId: string }) {
  const context = await getTeacherDataContext(input);
  const user = await UserModel.findOne().where({ _id: input.userId, schoolId: context.schoolId })
    .select('normalizedPhone normalizedEmail').lean();

  if (!context.academicYear) {
    const photoUrls = await getProfilePhotoUrls(input.schoolId, [context.teacher.photoFileId]);
    return {
      teacher: {
        id: context.teacher._id.toString(),
        displayName: context.teacher.displayName,
        designation: context.teacher.designation,
        subjects: context.teacher.subjects ?? [],
        qualifications: context.teacher.qualifications ?? [],
        experienceYears: context.teacher.experienceYears,
        specialization: context.teacher.specialization,
        biography: context.teacher.biography,
        languages: context.teacher.languages ?? [],
        photoUrl: context.teacher.photoFileId
          ? photoUrls.get(context.teacher.photoFileId.toString())
          : undefined,
        phone: user?.normalizedPhone ?? '',
        email: user?.normalizedEmail ?? '',
      },
      academicYear: null,
      classSections: [],
    };
  }

  const { assignments, sections } = await getTeacherAssignedSections({
    schoolId: context.schoolId,
    teacherId: context.teacher._id,
    academicYearId: context.academicYear._id,
    timeZone: context.timeZone,
  });
  const subjectIds = [...new Set(assignments.map(assignment => assignment.subjectId.toString()))];
  const [subjects, photoUrls] = await Promise.all([
    subjectIds.length
      ? SubjectModel.find().where({
        schoolId: context.schoolId,
        _id: { $in: subjectIds },
        status: 'active',
      }).select('_id name').lean()
      : [],
    getProfilePhotoUrls(input.schoolId, [context.teacher.photoFileId]),
  ]);

  return {
    teacher: {
      id: context.teacher._id.toString(),
      displayName: context.teacher.displayName,
      designation: context.teacher.designation,
      subjects: context.teacher.subjects ?? [],
      qualifications: context.teacher.qualifications ?? [],
      experienceYears: context.teacher.experienceYears,
      specialization: context.teacher.specialization,
      biography: context.teacher.biography,
      languages: context.teacher.languages ?? [],
      photoUrl: context.teacher.photoFileId
        ? photoUrls.get(context.teacher.photoFileId.toString())
        : undefined,
      phone: user?.normalizedPhone ?? '',
      email: user?.normalizedEmail ?? '',
    },
    academicYear: {
      id: context.academicYear._id.toString(),
      label: context.academicYear.label,
    },
    classSections: sections.map(section => ({
      id: section._id.toString(),
      academicYearId: section.academicYearId.toString(),
      className: section.className,
      section: section.section,
      subjects: assignments
        .filter(assignment => assignment.classSectionId.equals(section._id))
        .flatMap(assignment => {
          const subject = subjects.find(item => item._id.equals(assignment.subjectId));
          return subject ? [{ id: subject._id.toString(), name: subject.name }] : [];
        })
        .filter((subject, index, list) => list.findIndex(item => item.id === subject.id) === index),
    })),
  };
}
