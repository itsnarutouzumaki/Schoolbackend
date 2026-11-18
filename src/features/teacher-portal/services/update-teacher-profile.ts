import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import {
  completeGuardianUpload,
  createGuardianUploadIntent,
  getProfilePhotoUrls,
} from '../../files/services/index.js';
import { TeacherModel } from '../../people/models/index.js';

type TeacherProfilePhotoUploadInput = {
  schoolId: string;
  userId: string;
  fileId?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

type UpdateTeacherProfileInput = {
  schoolId: string;
  userId: string;
  fullName?: string;
  address?: string;
  awards?: string[];
  profilePhotoFileId?: string;
};

async function requireActiveTeacher(input: { schoolId: string; userId: string }) {
  const activeTeacher = await TeacherModel.exists({
    schoolId: input.schoolId,
    userId: input.userId,
    status: 'active',
  });
  if (!activeTeacher) {
    throw new ApiError(403, 'TEACHER_PROFILE_UNAVAILABLE', 'The teacher profile is not available.');
  }
}

export async function createTeacherProfilePhotoUploadIntent(
  input: TeacherProfilePhotoUploadInput,
) {
  await requireActiveTeacher(input);
  if (!input.fileName || !input.contentType || !input.sizeBytes) {
    throw new ApiError(400, 'REQUEST_INVALID', 'The profile photo upload details are invalid.');
  }
  return createGuardianUploadIntent({
    schoolId: input.schoolId,
    userId: input.userId,
    ownerType: 'teachers',
    purpose: 'profile-photo',
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
}

export async function completeTeacherProfilePhotoUpload(
  input: TeacherProfilePhotoUploadInput,
) {
  await requireActiveTeacher(input);
  if (!input.fileId) {
    throw new ApiError(400, 'FILE_ID_INVALID', 'A valid file ID is required.');
  }
  return completeGuardianUpload({
    fileId: input.fileId,
    schoolId: input.schoolId,
    userId: input.userId,
  });
}

export async function updateTeacherProfile(input: UpdateTeacherProfileInput) {
  const teacher = await TeacherModel.findOne({
    schoolId: input.schoolId,
    userId: input.userId,
    status: 'active',
  }).select('+privateContact +optionalDetails');
  if (!teacher) {
    throw new ApiError(403, 'TEACHER_PROFILE_UNAVAILABLE', 'The teacher profile is not available.');
  }

  if (input.profilePhotoFileId) {
    const photo = await FileRecordModel.findOne({
      _id: input.profilePhotoFileId,
      schoolId: input.schoolId,
      ownerUserId: input.userId,
      purpose: 'profile-photo',
      status: 'ready',
    });
    if (!photo) {
      throw new ApiError(400, 'PROFILE_PHOTO_INVALID', 'The profile photo is not available.');
    }
    photo.relatedEntityType = 'teacher';
    photo.relatedEntityId = teacher._id;
    await photo.save();
    teacher.photoFileId = new Types.ObjectId(input.profilePhotoFileId);
  }

  if (input.fullName !== undefined) teacher.displayName = input.fullName;
  if (input.address !== undefined) {
    teacher.set('privateContact.currentAddress', { line1: input.address });
  }
  if (input.awards !== undefined) {
    teacher.set('optionalDetails.awards', input.awards);
    teacher.markModified('optionalDetails');
  }

  await teacher.save();
  const photoUrls = await getProfilePhotoUrls(input.schoolId, [teacher.photoFileId]);
  const optionalDetails = teacher.get('optionalDetails') as Map<string, unknown> | undefined;
  const awards = optionalDetails?.get('awards');

  return {
    id: teacher.id,
    fullName: teacher.displayName,
    address: teacher.get('privateContact.currentAddress.line1') ?? '',
    awards: Array.isArray(awards) ? awards.filter((award): award is string => typeof award === 'string') : [],
    photoFileId: teacher.photoFileId?.toString(),
    photoUrl: teacher.photoFileId ? photoUrls.get(teacher.photoFileId.toString()) : undefined,
  };
}
