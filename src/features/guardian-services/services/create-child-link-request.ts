import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { ChildLinkModel, GuardianModel, StudentModel } from '../../people/models/index.js';
import { ChildLinkRequestModel } from '../models/index.js';

type CreateChildLinkRequestInput = {
  schoolId: string;
  userId: string;
  studentNumber: string;
  studentName?: string;
  relationship: string;
};

export async function createChildLinkRequest(input: CreateChildLinkRequestInput) {
  const guardian = await GuardianModel.findOne({ schoolId: input.schoolId, userId: input.userId }).select('_id');
  if (!guardian) {
    throw new ApiError(403, 'GUARDIAN_PROFILE_UNAVAILABLE', 'The guardian profile is not available.');
  }
  const studentNumber = input.studentNumber.trim().toUpperCase();
  const student = await StudentModel.findOne().where({
    schoolId: input.schoolId,
    studentNumber,
    status: 'active',
  }).select('_id');
  if (student && await ChildLinkModel.findOne().where({
    schoolId: input.schoolId,
    guardianId: guardian._id,
    studentId: student._id,
    status: 'approved',
  })) {
    throw new ApiError(409, 'CHILD_ALREADY_LINKED', 'This child is already linked to your account.');
  }
  const pendingRequest = await ChildLinkRequestModel.findOne().where({
    schoolId: input.schoolId,
    guardianId: guardian._id,
    proposedStudentNumber: studentNumber,
    status: 'pending',
  });
  if (pendingRequest) {
    throw new ApiError(409, 'LINK_REQUEST_EXISTS', 'A request for this student is already pending.');
  }

  const request = await ChildLinkRequestModel.create({
    schoolId: new Types.ObjectId(input.schoolId),
    guardianId: guardian._id,
    proposedStudentNumber: studentNumber,
    proposedStudentName: input.studentName?.trim(),
    relationship: input.relationship.trim(),
    status: 'pending',
    statusHistory: [{ status: 'pending', actorUserId: new Types.ObjectId(input.userId) }],
  });
  return {
    id: request.id,
    studentNumber: request.proposedStudentNumber,
    studentName: request.proposedStudentName,
    relationship: request.relationship,
    status: request.status,
    createdAt: request.createdAt,
  };
}
