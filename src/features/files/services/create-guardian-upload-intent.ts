import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../shared/errors/index.js';
import { FileRecordModel } from '../models/index.js';
import { createSignedUploadUrl } from '../storage/index.js';
import { SchoolModel } from '../../tenant/models/index.js';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const attachmentTypes = [...imageTypes, 'application/pdf'];
const maxImageBytes = 5 * 1024 * 1024;
const maxAttachmentBytes = 10 * 1024 * 1024;

export type GuardianFilePurpose = 'profile-photo' | 'complaint-attachment' | 'leave-attachment';

type CreateGuardianUploadIntentInput = {
  schoolId: string;
  userId: string;
  purpose: GuardianFilePurpose;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

function validateFile(input: CreateGuardianUploadIntentInput) {
  const allowedTypes = input.purpose === 'profile-photo' ? imageTypes : attachmentTypes;
  const maxBytes = input.purpose === 'profile-photo' ? maxImageBytes : maxAttachmentBytes;
  if (!allowedTypes.includes(input.contentType) || input.sizeBytes > maxBytes) {
    throw new ApiError(400, 'FILE_NOT_ALLOWED', 'The file type or size is not allowed for this upload.');
  }
  return maxBytes;
}

export async function createGuardianUploadIntent(input: CreateGuardianUploadIntentInput) {
  const maxBytes = validateFile(input);
  if (!env.GCS_BUCKET_NAME) {
    throw new ApiError(503, 'FILE_STORAGE_NOT_CONFIGURED', 'File storage is not configured.', true);
  }

  const school = await SchoolModel.findById(input.schoolId).select('fileRetentionDays');
  if (!school) {
    throw new ApiError(404, 'SCHOOL_NOT_FOUND', 'The selected school was not found.');
  }
  const fileId = new Types.ObjectId();
  const storageRef = `schools/${input.schoolId}/guardians/${input.userId}/${randomUUID()}`;
  const uploadExpiresAt = new Date(Date.now() + env.GCS_SIGNED_URL_TTL_SECONDS * 1000);
  const retentionDays = input.purpose === 'profile-photo' ? 3650 : school.fileRetentionDays;
  const file = await FileRecordModel.create({
    _id: fileId,
    schoolId: new Types.ObjectId(input.schoolId),
    fileCode: randomUUID(),
    ownerUserId: new Types.ObjectId(input.userId),
    purpose: input.purpose,
    storageProvider: 'gcs',
    storageRef,
    originalFileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    status: 'pending',
    uploadExpiresAt,
    retentionDays,
    retentionDeleteAt: new Date(uploadExpiresAt.getTime() + 24 * 60 * 60 * 1000),
  });

  try {
    const policy = await createSignedUploadUrl(storageRef, input.contentType, maxBytes);
    return {
      fileId: file.id,
      uploadUrl: policy.url,
      method: 'POST' as const,
      fields: policy.fields,
      expiresAt: uploadExpiresAt.toISOString(),
    };
  } catch (error) {
    await file.deleteOne();
    throw error;
  }
}
