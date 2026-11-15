import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../shared/errors/index.js';

function getEncryptionKey() {
  const key = Buffer.from(env.DEVICE_TOKEN_ENCRYPTION_KEY ?? '', 'base64');
  if (key.length !== 32) {
    throw new ApiError(
      503,
      'DEVICE_TOKEN_ENCRYPTION_NOT_CONFIGURED',
      'Device token encryption is not configured.',
      true,
    );
  }
  return key;
}

export function hashDeviceToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function encryptDeviceToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptDeviceToken(encryptedToken: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = encryptedToken.split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error('Stored device token has an unsupported encrypted format.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encodedIv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
