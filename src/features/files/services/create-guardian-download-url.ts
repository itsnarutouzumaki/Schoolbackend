import { Types } from 'mongoose';
import { ClassSectionModel, SubjectAssignmentModel } from '../../academics/models/index.js';
import { AssessmentModel, AssessmentResultModel } from '../../assessments/models/index.js';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../shared/errors/index.js';
import { GuardianModel, ChildLinkModel, StudentModel } from '../../people/models/index.js';
import { FileRecordModel } from '../models/index.js';
import type { FileRecord } from '../models/file-record.model.js';
import { createSignedDownloadUrl } from '../storage/index.js';

type CreateGuardianDownloadUrlInput = {
  fileId: string;
  schoolId: string;
  userId: string;
};

export async function createGuardianDownloadUrl(input: CreateGuardianDownloadUrlInput) {
  if (!Types.ObjectId.isValid(input.fileId)) {
    throw new ApiError(400, 'FILE_ID_INVALID', 'A valid file ID is required.');
  }
  const fileRecord = await FileRecordModel.findOne({
    _id: input.fileId,
    schoolId: input.schoolId,
    status: 'ready',
  }).select('+storageRef +storageGeneration ownerUserId purpose relatedEntityType relatedEntityId');

  if (!fileRecord?.storageRef || !fileRecord.storageGeneration) {
    throw new ApiError(404, 'FILE_NOT_FOUND', 'The file was not found.');
  }
  const isOwner = fileRecord.ownerUserId.equals(new Types.ObjectId(input.userId));
  if (!isOwner && !(await canGuardianAccessReferencedFile(input, fileRecord))) {
    throw new ApiError(404, 'FILE_NOT_FOUND', 'The file was not found.');
  }
  return {
    downloadUrl: await createSignedDownloadUrl(fileRecord.storageRef, fileRecord.storageGeneration),
    expiresInSeconds: env.GCS_SIGNED_URL_TTL_SECONDS,
  };
}

async function canGuardianAccessReferencedFile(
  input: CreateGuardianDownloadUrlInput,
  fileRecord: Pick<FileRecord, 'purpose' | 'relatedEntityType' | 'relatedEntityId'>,
) {
  if (fileRecord.purpose !== 'profile-photo' && fileRecord.purpose !== 'answer-copy') return false;
  if (!fileRecord.relatedEntityType || !fileRecord.relatedEntityId) return false;

  const guardian = await GuardianModel.findOne({
    schoolId: input.schoolId,
    userId: input.userId,
  }).select('_id');
  if (!guardian) return false;
  if (fileRecord.relatedEntityType === 'guardian') {
    return fileRecord.relatedEntityId.equals(guardian._id);
  }

  const links = await ChildLinkModel.find().where({
    schoolId: input.schoolId,
    guardianId: guardian._id,
    status: 'approved',
  }).select('studentId').lean();
  const linkedStudentIds = links.map(link => link.studentId);
  if (fileRecord.relatedEntityType === 'student') {
    return linkedStudentIds.some(id => id.equals(fileRecord.relatedEntityId));
  }
  if (fileRecord.relatedEntityType === 'assessmentResult') {
    const result = await AssessmentResultModel.findOne().where({
      _id: fileRecord.relatedEntityId,
      schoolId: input.schoolId,
      studentId: { $in: linkedStudentIds },
    }).select('assessmentId');
    return result
      ? Boolean(await AssessmentModel.exists({
        _id: result.assessmentId,
        schoolId: input.schoolId,
        status: 'published',
      }))
      : false;
  }
  if (fileRecord.relatedEntityType !== 'teacher' || linkedStudentIds.length === 0) return false;

  const students = await StudentModel.find().where({
    schoolId: input.schoolId,
    _id: { $in: linkedStudentIds },
    status: 'active',
  }).select('classSectionId');
  const classSectionIds = students.flatMap(student => student.classSectionId ? [student.classSectionId] : []);
  const [classTeacherMatch, assignmentMatch] = await Promise.all([
    ClassSectionModel.exists({
      schoolId: input.schoolId,
      _id: { $in: classSectionIds },
      classTeacherId: fileRecord.relatedEntityId,
    }),
    SubjectAssignmentModel.exists({
      schoolId: input.schoolId,
      classSectionId: { $in: classSectionIds },
      teacherId: fileRecord.relatedEntityId,
      active: true,
    }),
  ]);
  return Boolean(classTeacherMatch || assignmentMatch);
}
