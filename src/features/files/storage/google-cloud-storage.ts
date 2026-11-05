import { Storage } from '@google-cloud/storage';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../shared/errors/index.js';

let storage: Storage | undefined;

function getBucket() {
  if (!env.GCS_BUCKET_NAME) {
    throw new ApiError(503, 'FILE_STORAGE_NOT_CONFIGURED', 'File storage is not configured.', true);
  }
  storage ??= new Storage(env.GCS_PROJECT_ID ? { projectId: env.GCS_PROJECT_ID } : undefined);
  return storage.bucket(env.GCS_BUCKET_NAME);
}

function expiresAt() {
  return Date.now() + env.GCS_SIGNED_URL_TTL_SECONDS * 1000;
}

export async function createSignedUploadUrl(storageRef: string, contentType: string, maxBytes: number) {
  const [policy] = await getBucket().file(storageRef).generateSignedPostPolicyV4({
    expires: expiresAt(),
    fields: { key: storageRef, 'Content-Type': contentType },
    conditions: [
      { key: storageRef },
      ['eq', '$Content-Type', contentType],
      ['content-length-range', 1, maxBytes + 64 * 1024],
    ],
  });
  return policy;
}

export async function getStoredFileMetadata(storageRef: string) {
  const [metadata] = await getBucket().file(storageRef).getMetadata();
  return metadata;
}

export async function getStoredFileHeader(storageRef: string) {
  const [contents] = await getBucket().file(storageRef).download({ start: 0, end: 15 });
  return contents;
}

export async function createSignedDownloadUrl(storageRef: string, generation: string) {
  const [url] = await getBucket().file(storageRef, { generation }).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt(),
    responseDisposition: 'attachment',
  });
  return url;
}

export async function deleteStoredFile(storageRef: string) {
  await getBucket().file(storageRef).delete({ ignoreNotFound: true });
}
