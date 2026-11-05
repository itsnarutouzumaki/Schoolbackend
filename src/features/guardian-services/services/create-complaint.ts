import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import { GuardianModel, ChildLinkModel } from '../../people/models/index.js';
import { ComplaintModel } from '../models/index.js';

type CreateComplaintInput = {
  schoolId: string;
  userId: string;
  childId: string;
  subject: string;
  message: string;
  attachmentFileIds: string[];
};

export async function createComplaint(input: CreateComplaintInput) {
  if (!Types.ObjectId.isValid(input.childId)) {
    throw new ApiError(400, 'CHILD_ID_INVALID', 'A valid linked child ID is required.');
  }
  if (input.attachmentFileIds.some(fileId => !Types.ObjectId.isValid(fileId))) {
    throw new ApiError(400, 'ATTACHMENT_INVALID', 'One or more attachments are invalid.');
  }

  const guardian = await GuardianModel.findOne({ schoolId: input.schoolId, userId: input.userId }).select('_id');
  if (!guardian) {
    throw new ApiError(403, 'GUARDIAN_PROFILE_UNAVAILABLE', 'The guardian profile is not available.');
  }
  const link = await ChildLinkModel.exists({
    schoolId: input.schoolId,
    guardianId: guardian._id,
    studentId: input.childId,
    status: 'approved',
  });
  if (!link) throw new ApiError(404, 'CHILD_NOT_FOUND', 'The linked child was not found.');
  if (input.attachmentFileIds.length) {
    const attachments = await FileRecordModel.countDocuments({
      _id: { $in: input.attachmentFileIds },
      schoolId: input.schoolId,
      ownerUserId: input.userId,
      purpose: 'complaint-attachment',
      status: 'ready',
    });
    if (attachments !== input.attachmentFileIds.length) {
      throw new ApiError(400, 'ATTACHMENT_INVALID', 'One or more attachments are not available.');
    }
  }

  const complaint = await ComplaintModel.create({
    schoolId: new Types.ObjectId(input.schoolId),
    guardianId: guardian._id,
    studentId: new Types.ObjectId(input.childId),
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: 'open',
    attachmentFileIds: input.attachmentFileIds.map(fileId => new Types.ObjectId(fileId)),
    statusHistory: [{ status: 'open', actorUserId: new Types.ObjectId(input.userId) }],
  });
  if (input.attachmentFileIds.length) {
    await FileRecordModel.updateMany(
      { _id: { $in: input.attachmentFileIds }, schoolId: input.schoolId, ownerUserId: input.userId },
      { $set: { relatedEntityType: 'complaint', relatedEntityId: complaint._id } },
    );
  }
  return {
    id: complaint.id,
    childId: complaint.studentId?.toString(),
    subject: complaint.subject,
    message: complaint.message,
    status: complaint.status,
    attachmentFileIds: complaint.attachmentFileIds.map((id: Types.ObjectId) => id.toString()),
    createdAt: complaint.createdAt,
  };
}
