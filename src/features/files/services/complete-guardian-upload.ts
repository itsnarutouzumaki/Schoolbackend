import { Types } from 'mongoose';
import { ApiError } from '../../../shared/errors/index.js';
import { FileRecordModel } from '../models/index.js';
import { deleteStoredFile, getStoredFileHeader, getStoredFileMetadata } from '../storage/index.js';

type CompleteGuardianUploadInput = {
  fileId: string;
  schoolId: string;
  userId: string;
};

export async function completeGuardianUpload(input: CompleteGuardianUploadInput) {
  if (!Types.ObjectId.isValid(input.fileId)) {
    throw new ApiError(400, 'FILE_ID_INVALID', 'A valid file ID is required.');
  }
  const fileRecord = await FileRecordModel.findOne({
    _id: input.fileId,
    schoolId: input.schoolId,
    ownerUserId: input.userId,
    purpose: { $in: ['profile-photo', 'complaint-attachment', 'leave-attachment'] },
    status: { $in: ['pending', 'ready'] },
  }).select('+storageRef');

  if (!fileRecord || !fileRecord.storageRef) {
    throw new ApiError(404, 'FILE_UPLOAD_NOT_FOUND', 'The pending upload was not found.');
  }
  if (fileRecord.status === 'ready') {
    return { fileId: fileRecord.id, status: fileRecord.status };
  }
  if (!fileRecord.uploadExpiresAt || fileRecord.uploadExpiresAt <= new Date()) {
    await deleteStoredFile(fileRecord.storageRef);
    fileRecord.status = 'deleted';
    fileRecord.deletedAt = new Date();
    await fileRecord.save();
    throw new ApiError(410, 'FILE_UPLOAD_EXPIRED', 'The upload has expired.');
  }

  let metadata: Awaited<ReturnType<typeof getStoredFileMetadata>>;
  try {
    metadata = await getStoredFileMetadata(fileRecord.storageRef);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 404) {
      throw new ApiError(409, 'FILE_UPLOAD_INCOMPLETE', 'The file has not been uploaded yet.');
    }
    throw error;
  }

  const actualSize = Number(metadata.size);
  if (
    actualSize !== fileRecord.sizeBytes
    || metadata.contentType !== fileRecord.contentType
    || typeof metadata.crc32c !== 'string'
    || typeof metadata.generation !== 'string'
  ) {
    await deleteStoredFile(fileRecord.storageRef);
    fileRecord.status = 'deleted';
    fileRecord.deletedAt = new Date();
    await fileRecord.save();
    throw new ApiError(400, 'FILE_UPLOAD_INVALID', 'The uploaded file does not match its declared details.');
  }

  const header = await getStoredFileHeader(fileRecord.storageRef);
  if (!matchesDeclaredContentType(fileRecord.contentType, header)) {
    await deleteStoredFile(fileRecord.storageRef);
    fileRecord.status = 'deleted';
    fileRecord.deletedAt = new Date();
    await fileRecord.save();
    throw new ApiError(400, 'FILE_CONTENT_INVALID', 'The uploaded file content does not match its declared type.');
  }

  fileRecord.crc32c = metadata.crc32c;
  fileRecord.storageGeneration = metadata.generation;
  fileRecord.status = 'ready';
  fileRecord.readyAt = new Date();
  fileRecord.retentionDeleteAt = new Date(
    fileRecord.readyAt.getTime() + fileRecord.retentionDays * 24 * 60 * 60 * 1000,
  );
  await fileRecord.save();
  return { fileId: fileRecord.id, status: fileRecord.status };
}

function matchesDeclaredContentType(contentType: string, header: Buffer) {
  if (contentType === 'image/jpeg') {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === 'image/webp') {
    return header.length >= 12
      && header.toString('ascii', 0, 4) === 'RIFF'
      && header.toString('ascii', 8, 12) === 'WEBP';
  }
  return contentType === 'application/pdf' && header.toString('ascii', 0, 5) === '%PDF-';
}
