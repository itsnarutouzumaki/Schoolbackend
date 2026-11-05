import { Types } from 'mongoose';
import { AcademicYearModel, ClassSectionModel, SubjectAssignmentModel, SubjectModel } from '../../academics/models/index.js';
import { AssessmentModel, AssessmentResultModel } from '../../assessments/models/index.js';
import { AttendanceEntryModel } from '../../attendance/models/index.js';
import { FeeReceiptModel } from '../../fees/models/index.js';
import { ComplaintModel, ChildLinkRequestModel, LeaveRequestModel } from '../../guardian-services/models/index.js';
import { GuardianModel, ChildLinkModel, StudentModel, TeacherModel } from '../../people/models/index.js';
import { NotificationModel } from '../../notifications/models/index.js';
import { SchoolModel } from '../../tenant/models/index.js';
import { UserModel } from '../../auth/models/index.js';
import { ApiError } from '../../../shared/errors/index.js';

export async function getGuardianBootstrap(input: {
  schoolId: string;
  userId: string;
}) {
  const schoolId = new Types.ObjectId(input.schoolId);
  const userId = new Types.ObjectId(input.userId);
  const guardian = await GuardianModel.findOne({ schoolId, userId })
    .select('_id fullName photoFileId relationshipDetails +currentAddress')
    .lean();
  if (!guardian) {
    throw new ApiError(403, 'GUARDIAN_PROFILE_UNAVAILABLE', 'The guardian profile is not available.');
  }

  const [school, user, years, links, complaints, leaveRequests, linkRequests, notifications] =
    await Promise.all([
      SchoolModel.findById(schoolId).select('code name timezone currentAcademicYearId branding').lean(),
      UserModel.findById(userId).select('normalizedPhone normalizedEmail').lean(),
      AcademicYearModel.find().where({ schoolId }).select('label startsOn endsOn status').sort({ startsOn: -1 }).lean(),
      ChildLinkModel.find().where({ schoolId, guardianId: guardian._id, status: 'approved' })
        .select('studentId relationship status').lean(),
      ComplaintModel.find().where({ schoolId, guardianId: guardian._id })
        .select('studentId subject message status attachmentFileIds createdAt updatedAt').sort({ createdAt: -1 }).lean(),
      LeaveRequestModel.find().where({ schoolId, guardianId: guardian._id })
        .select('studentId startsOn endsOn reason status fileIds createdAt updatedAt').sort({ createdAt: -1 }).lean(),
      ChildLinkRequestModel.find().where({ schoolId, guardianId: guardian._id })
        .select('proposedStudentNumber proposedStudentName relationship status createdAt reviewedAt reviewNote').sort({ createdAt: -1 }).lean(),
      NotificationModel.find().where({ schoolId, recipientUserId: userId, targetAudience: 'guardian' })
        .select('eventId eventType subject body routeName routeParams readAt createdAt').sort({ createdAt: -1 }).limit(200).lean(),
    ]);

  const studentIds = links.map(link => link.studentId);
  const students = await StudentModel.find().where({
    schoolId,
    _id: { $in: studentIds },
    status: 'active',
  }).select('studentNumber displayName admissionNumber photoFileId classSectionId rollNumber').lean();
  const classSectionIds = students.flatMap(student => student.classSectionId ? [student.classSectionId] : []);
  const sections = await ClassSectionModel.find().where({ schoolId, _id: { $in: classSectionIds } })
    .select('academicYearId className section classTeacherId').lean();
  const sectionIds = sections.map(section => section._id);
  const sectionYearIds = sections.map(section => section.academicYearId);
  const [assignments, attendances, assessments, receipts] = await Promise.all([
    SubjectAssignmentModel.find().where({ schoolId, classSectionId: { $in: sectionIds }, active: true })
      .select('classSectionId subjectId teacherId academicYearId').lean(),
    AttendanceEntryModel.find().where({ schoolId, studentId: { $in: studentIds } })
      .select('studentId date status').sort({ date: 1 }).lean(),
    AssessmentModel.find().where({ schoolId, classSectionId: { $in: sectionIds }, academicYearId: { $in: sectionYearIds }, status: 'published' })
      .select('classSectionId subjectId academicYearId teacherId type title date').sort({ date: -1 }).lean(),
    FeeReceiptModel.find().where({ schoolId, studentId: { $in: studentIds }, academicYearId: { $in: sectionYearIds } })
      .select('studentId academicYearId period periodSort breakdown totalMinor currency status paidAt paymentMethod receiptNumber').sort({ periodSort: -1 }).lean(),
  ]);
  const [subjects, teachers, results] = await Promise.all([
    SubjectModel.find().where({ schoolId, _id: { $in: assignments.map(item => item.subjectId) } })
      .select('name code').lean(),
    TeacherModel.find().where({ schoolId, _id: { $in: assignments.map(item => item.teacherId).concat(sections.flatMap(item => item.classTeacherId ? [item.classTeacherId] : [])) }, status: 'active' })
      .select('displayName designation subjects qualifications experienceYears specialization biography languages photoFileId').lean(),
    AssessmentResultModel.find().where({ schoolId, studentId: { $in: studentIds }, assessmentId: { $in: assessments.map(item => item._id) } })
      .select('assessmentId studentId obtainedMarks maxMarks remarks answerCopyFileId').lean(),
  ]);

  return {
    school: school ? {
      code: school.code,
      name: school.name,
      timezone: school.timezone,
      academicYears: years,
      currentAcademicYearId: school.currentAcademicYearId?.toString(),
      branding: school.branding,
    } : null,
    account: {
      id: userId.toString(),
      role: 'guardian' as const,
      profile: {
        id: guardian._id.toString(),
        fullName: guardian.fullName,
        phone: user?.normalizedPhone ?? '',
        email: user?.normalizedEmail ?? '',
        photoFileId: guardian.photoFileId?.toString(),
        address: guardian.currentAddress?.line1 ?? '',
        relationship: guardian.relationshipDetails ?? 'Parent',
      },
    },
    children: students.map(student => ({
      id: student._id.toString(),
      studentNumber: student.studentNumber,
      fullName: student.displayName,
      admissionNumber: student.admissionNumber,
      photoFileId: student.photoFileId?.toString(),
      rollNumber: student.rollNumber,
      relationship: links.find(link => link.studentId.equals(student._id))?.relationship ?? '',
      classSection: sections.find(section => section._id.equals(student.classSectionId)),
      academicYears: years.filter(year => sections
        .filter(section => section._id.equals(student.classSectionId))
        .some(section => section.academicYearId.equals(year._id))),
      attendance: attendances.filter(item => item.studentId.equals(student._id)),
      publishedAssessments: assessments.filter(item => item.classSectionId.equals(student.classSectionId)),
      results: results.filter(item => item.studentId.equals(student._id)),
      feeReceipts: receipts.filter(item => item.studentId.equals(student._id)),
      subjectAssignments: assignments.filter(item => item.classSectionId.equals(student.classSectionId)),
      subjects: subjects.filter(subject => assignments.some(
        assignment => assignment.classSectionId.equals(student.classSectionId)
          && assignment.subjectId.equals(subject._id),
      )),
      teachers: teachers.filter(teacher => assignments.some(
        assignment => assignment.classSectionId.equals(student.classSectionId)
          && assignment.teacherId.equals(teacher._id),
      ) || sections.some(
        section => section._id.equals(student.classSectionId)
          && section.classTeacherId?.equals(teacher._id),
      )),
    })),
    complaints,
    leaveRequests,
    childLinkRequests: linkRequests,
    notifications,
  };
}
