import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { UserModel } from '../../auth/models/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import { ComplaintModel } from '../../guardian-services/models/index.js';
import { ChildLinkModel, GuardianModel, SchoolAdminProfileModel } from '../../people/models/index.js';
import { sendNotification } from '../../notifications/services/index.js';
import { findTeacherStudent } from './find-teacher-student.js';

type SendTeacherConcernInput = {
  schoolId: string;
  userId: string;
  recipient: 'schoolAdmin' | 'guardian';
  studentNumber?: string;
  subject: string;
  description: string;
  attachmentFileId?: string;
};

async function getActiveSchoolAdminId(schoolId: string) {
  const admins = await SchoolAdminProfileModel.find().where({
    schoolId,
    status: 'active',
  }).select('userId').sort({ _id: 1 }).lean();
  const activeUsers = await UserModel.find().where({
    schoolId,
    _id: { $in: admins.map(admin => admin.userId) },
    role: 'schoolAdmin',
    status: 'active',
  }).select('_id').lean();
  const activeIds = new Set(activeUsers.map(user => user._id.toString()));
  const id = admins.find(admin => activeIds.has(admin.userId.toString()))?.userId.toString();
  if (!id) {
    throw new ApiError(404, 'NOTIFICATION_RECIPIENT_UNAVAILABLE', 'School Administration is not available.');
  }
  return id;
}

async function getStudentGuardians(input: {
  schoolId: string;
  studentId: string;
}) {
  const links = await ChildLinkModel.find().where({
    schoolId: input.schoolId,
    studentId: input.studentId,
    status: 'approved',
  }).select('guardianId').lean();
  if (!links.length) {
    throw new ApiError(404, 'NOTIFICATION_RECIPIENT_UNAVAILABLE', 'The student has no approved parent or guardian accounts.');
  }

  const profiles = await GuardianModel.find().where({
    schoolId: input.schoolId,
    _id: { $in: links.map(link => link.guardianId) },
  }).select('userId').lean();
  const users = await UserModel.find().where({
    schoolId: input.schoolId,
    _id: { $in: profiles.map(profile => profile.userId) },
    role: 'guardian',
    status: 'active',
  }).select('_id').lean();
  if (!users.length) {
    throw new ApiError(404, 'NOTIFICATION_RECIPIENT_UNAVAILABLE', 'The student has no active parent or guardian accounts.');
  }
  return users.map(user => user._id.toString());
}

export async function sendTeacherConcern(input: SendTeacherConcernInput) {
  let receiverUserIds: string[];
  let receiverRole: 'schoolAdmin' | 'guardian';
  let studentDetails = '';
  let studentId: Types.ObjectId | undefined;

  if (input.recipient === 'schoolAdmin') {
    receiverUserIds = [await getActiveSchoolAdminId(input.schoolId)];
    receiverRole = 'schoolAdmin';
  } else {
    if (!input.studentNumber) {
      throw new ApiError(400, 'STUDENT_NUMBER_INVALID', 'A student number is required to contact a parent or guardian.');
    }
    const student = await findTeacherStudent({
      schoolId: input.schoolId,
      userId: input.userId,
      studentNumber: input.studentNumber,
    });
    receiverUserIds = await getStudentGuardians({
      schoolId: input.schoolId,
      studentId: student.id,
    });
    receiverRole = 'guardian';
    studentId = new Types.ObjectId(student.id);
    studentDetails = `Student: ${student.fullName} (${student.classSection.className} - Section ${student.classSection.section})\n\n`;
  }

  const description = `${studentDetails}${input.description.trim()}`;
  if (description.length > 2000) {
    throw new ApiError(400, 'NOTIFICATION_DESCRIPTION_TOO_LONG', 'The description exceeds the notification limit.');
  }

  if (input.attachmentFileId) {
    if (!Types.ObjectId.isValid(input.attachmentFileId)) {
      throw new ApiError(400, 'NOTIFICATION_ATTACHMENT_INVALID', 'The attachment reference is invalid.');
    }
    const file = await FileRecordModel.exists({
      _id: input.attachmentFileId,
      schoolId: input.schoolId,
      ownerUserId: input.userId,
      purpose: 'complaint-attachment',
      status: 'ready',
      sizeBytes: { $lte: 1024 * 1024 },
      contentType: { $in: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
    });
    if (!file) {
      throw new ApiError(400, 'NOTIFICATION_ATTACHMENT_INVALID', 'The attachment is not available or exceeds the allowed size.');
    }
  }

  const complaint = await ComplaintModel.create({
    schoolId: new Types.ObjectId(input.schoolId),
    senderUserId: new Types.ObjectId(input.userId),
    senderRole: 'teacher',
    recipientRole: studentId ? 'student' : 'schoolAdmin',
    recipientUserIds: studentId?.toString() ?? receiverUserIds[0],
    subject: input.subject.trim(),
    message: description,
    status: 'open',
    ...(input.attachmentFileId ? { attachmentFileIds: [new Types.ObjectId(input.attachmentFileId)] } : {}),
  });

  if (input.recipient === 'schoolAdmin') {
    return { complaintId: complaint._id.toString(), recipientCount: 0, delivery: [] };
  }

  const notification = await sendNotification({
    schoolId: input.schoolId,
    senderUserId: input.userId,
    senderRole: 'teacher',
    receiverUserIds,
    receiverRole,
    subject: input.subject.trim(),
    description,
    attachmentFileId: input.attachmentFileId,
    eventType: 'complaint',
  });
  return { complaintId: complaint._id.toString(), ...notification };
}
