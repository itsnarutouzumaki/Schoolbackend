import { Types } from 'mongoose';
import { FileRecordModel } from '../models/index.js';
import { createSignedDownloadUrl } from '../storage/index.js';

export async function getProfilePhotoUrls(
  schoolId: string,
  fileIds: Array<Types.ObjectId | undefined>,
): Promise<Map<string, string>> {
  const ids = [...new Set(fileIds.filter((id): id is Types.ObjectId => Boolean(id)).map(id => id.toString()))];
  if (!ids.length) return new Map();

  const files = await FileRecordModel.find({
    schoolId,
    _id: { $in: ids },
    purpose: 'profile-photo',
    status: 'ready',
  }).select('+storageRef +storageGeneration').lean();

  const entries = await Promise.all(files.map(async file => {
    if (!file.storageRef || !file.storageGeneration) return null;
    return [
      file._id.toString(),
      await createSignedDownloadUrl(file.storageRef, file.storageGeneration),
    ] as const;
  }));
  return new Map(entries.filter((entry): entry is readonly [string, string] => entry !== null));
}
