import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { FileRecordModel } from '../../files/models/index.js';
import { GuardianModel } from '../../people/models/index.js';

type UpdateGuardianProfileInput = {
  schoolId: string;
  userId: string;
  fullName: string;
  address?: string;
  profilePhotoFileId?: string;
};

export async function updateGuardianProfile(input: UpdateGuardianProfileInput) {
  const guardian = await GuardianModel.findOne({
    schoolId: input.schoolId,
    userId: input.userId,
  }).select('+currentAddress');
  if (!guardian) {
    throw new ApiError(404, 'GUARDIAN_PROFILE_NOT_FOUND', 'The guardian profile was not found.');
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
    photo.relatedEntityType = 'guardian';
    photo.relatedEntityId = guardian._id;
    await photo.save();
    guardian.photoFileId = new Types.ObjectId(input.profilePhotoFileId);
  }

  guardian.fullName = input.fullName;
  if (input.address !== undefined) {
    guardian.currentAddress = { line1: input.address };
  }
  await guardian.save();
  return {
    id: guardian.id,
    fullName: guardian.fullName,
    photoFileId: guardian.photoFileId?.toString(),
    address: input.address,
  };
}
