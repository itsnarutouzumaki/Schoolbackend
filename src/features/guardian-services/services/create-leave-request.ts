import bcrypt from 'bcrypt';
import { Buffer } from 'node:buffer';
import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { UserModel } from '../../auth/models/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import { GuardianModel, ChildLinkModel } from '../../people/models/index.js';
import { LeaveRequestModel } from '../models/index.js';

type CreateLeaveRequestInput = {
  schoolId: string;
  userId: string;
  childId: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  password: string;
  fileIds: string[];
};

function isValidDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

export async function createLeaveRequest(input: CreateLeaveRequestInput) {
  if (!Types.ObjectId.isValid(input.childId) || !isValidDate(input.startsOn)
    || !isValidDate(input.endsOn) || input.startsOn > input.endsOn) {
    throw new ApiError(400, 'LEAVE_REQUEST_INVALID', 'The child or leave dates are invalid.');
  }
  if (Buffer.byteLength(input.password, 'utf8') > 72) {
    throw new ApiError(400, 'PASSWORD_LENGTH_INVALID', 'The password exceeds the supported length.');
  }

  const [guardian, user] = await Promise.all([
    GuardianModel.findOne({ schoolId: input.schoolId, userId: input.userId }).select('_id'),
    UserModel.findById(input.userId).select('+passwordHash'),
  ]);
  if (!guardian || !user) {
    throw new ApiError(403, 'GUARDIAN_PROFILE_UNAVAILABLE', 'The guardian profile is not available.');
  }
  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'PASSWORD_INVALID', 'The password is not correct.');
  }
  if (input.fileIds.some(fileId => !Types.ObjectId.isValid(fileId))) {
    throw new ApiError(400, 'ATTACHMENT_INVALID', 'One or more attachments are invalid.');
  }
  if (input.fileIds.length) {
    const attachments = await FileRecordModel.countDocuments({
      _id: { $in: input.fileIds },
      schoolId: input.schoolId,
      ownerUserId: input.userId,
      purpose: 'leave-attachment',
      status: 'ready',
    });
    if (attachments !== input.fileIds.length) {
      throw new ApiError(400, 'ATTACHMENT_INVALID', 'One or more attachments are not available.');
    }
  }

  const childLink = await ChildLinkModel.exists({
    schoolId: input.schoolId,
    guardianId: guardian._id,
    studentId: input.childId,
    status: 'approved',
  });
  if (!childLink) {
    throw new ApiError(404, 'CHILD_NOT_FOUND', 'The linked child was not found.');
  }

  const request = await LeaveRequestModel.create({
    schoolId: new Types.ObjectId(input.schoolId),
    guardianId: guardian._id,
    studentId: new Types.ObjectId(input.childId),
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    reason: input.reason.trim(),
    status: 'pending',
    statusHistory: [{ status: 'pending', actorUserId: new Types.ObjectId(input.userId) }],
    fileIds: input.fileIds.map(fileId => new Types.ObjectId(fileId)),
  });
  if (input.fileIds.length) {
    await FileRecordModel.updateMany(
      { _id: { $in: input.fileIds }, schoolId: input.schoolId, ownerUserId: input.userId },
      { $set: { relatedEntityType: 'leaveRequest', relatedEntityId: request._id } },
    );
  }
  return {
    id: request.id,
    childId: request.studentId.toString(),
    startsOn: request.startsOn,
    endsOn: request.endsOn,
    reason: request.reason,
    status: request.status,
    fileIds: request.fileIds.map((id: Types.ObjectId) => id.toString()),
    createdAt: request.createdAt,
  };
}
