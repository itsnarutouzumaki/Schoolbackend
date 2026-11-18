import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { ClassSectionModel } from '../../academics/models/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import { ComplaintModel } from '../models/index.js';
import { ChildLinkModel, GuardianModel, SchoolAdminProfileModel, StudentModel, TeacherModel } from '../../people/models/index.js';
import { UserModel } from '../../auth/models/index.js';
import { sendNotification } from '../../notifications/services/index.js';

type SendGuardianConcernInput = {
  schoolId: string;
  userId: string;
  recipientUserId: string;
  recipientRole: 'teacher' | 'schoolAdmin';
  studentScope: 'all' | string;
  subject: string;
  description: string;
  attachmentFileId?: string;
};

export async function sendGuardianConcern(input: SendGuardianConcernInput) {
  if (!Types.ObjectId.isValid(input.recipientUserId)) {
    throw new ApiError(400, 'NOTIFICATION_RECIPIENTS_INVALID', 'A valid recipient is required.');
  }
  const guardian = await GuardianModel.findOne({
    schoolId: input.schoolId,
    userId: input.userId,
  }).select('_id');
  if (!guardian) {
    throw new ApiError(403, 'GUARDIAN_PROFILE_UNAVAILABLE', 'The guardian profile is not available.');
  }

  const recipientProfileFilter = {
    schoolId: input.schoolId,
    userId: input.recipientUserId,
    status: 'active',
  };
  const recipientProfile = input.recipientRole === 'teacher'
    ? await TeacherModel.findOne().where(recipientProfileFilter).select('_id').lean()
    : await SchoolAdminProfileModel.findOne().where(recipientProfileFilter).select('_id').lean();
  if (!recipientProfile) {
    throw new ApiError(404, 'NOTIFICATION_RECIPIENT_UNAVAILABLE', 'The selected recipient is not available.');
  }
  const activeRecipient = await UserModel.findOne().where({
    _id: input.recipientUserId,
    schoolId: input.schoolId,
    role: input.recipientRole,
    status: 'active',
  }).select('_id').lean();
  if (!activeRecipient) {
    throw new ApiError(404, 'NOTIFICATION_RECIPIENT_UNAVAILABLE', 'The selected recipient is not available.');
  }

  const childLinks = await ChildLinkModel.find().where({
    schoolId: input.schoolId,
    guardianId: guardian._id,
    status: 'approved',
    ...(input.studentScope === 'all' ? {} : { studentId: input.studentScope }),
  }).select('studentId').lean();
  if (input.studentScope !== 'all' && childLinks.length !== 1) {
    throw new ApiError(404, 'CHILD_NOT_FOUND', 'The selected linked child was not found.');
  }
  if (childLinks.length === 0) {
    throw new ApiError(404, 'CHILD_NOT_FOUND', 'No active linked children were found.');
  }

  const students = await StudentModel.find().where({
    schoolId: input.schoolId,
    _id: { $in: childLinks.map(link => link.studentId) },
    status: 'active',
  }).select('displayName classSectionId').lean();
  if (students.length !== childLinks.length) {
    throw new ApiError(404, 'CHILD_NOT_FOUND', 'One or more linked children are no longer active.');
  }
  const sections = await ClassSectionModel.find().where({
    schoolId: input.schoolId,
    _id: { $in: students.flatMap(student => student.classSectionId ? [student.classSectionId] : []) },
  }).select('className section').lean();
  const childLabels = students.map(student => {
    const section = student.classSectionId
      ? sections.find(item => item._id.equals(student.classSectionId))
      : undefined;
    if (!section) {
      throw new ApiError(409, 'CHILD_CLASS_UNAVAILABLE', 'A linked child is missing class and section information.');
    }
    return `${student.displayName} (${section.className} - Section ${section.section})`;
  });
  const notificationDescription = `Student(s): ${childLabels.join(', ')}\n\n${input.description.trim()}`;
  if (notificationDescription.length > 2000) {
    throw new ApiError(400, 'NOTIFICATION_DESCRIPTION_TOO_LONG', 'The student details and description exceed the allowed length.');
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
    senderRole: 'guardian',
    recipientRole: input.recipientRole,
    recipientUserIds: input.recipientUserId,
    subject: input.subject.trim(),
    message: notificationDescription,
    status: 'open',
    ...(input.attachmentFileId ? { attachmentFileIds: [new Types.ObjectId(input.attachmentFileId)] } : {}),
  });

  const notification = await sendNotification({
    schoolId: input.schoolId,
    senderUserId: input.userId,
    senderRole: 'guardian',
    receiverUserIds: [input.recipientUserId],
    receiverRole: input.recipientRole,
    subject: input.subject.trim(),
    description: notificationDescription,
    attachmentFileId: input.attachmentFileId,
    eventType: 'complaint',
  });
  return { complaintId: complaint._id.toString(), ...notification };
}
