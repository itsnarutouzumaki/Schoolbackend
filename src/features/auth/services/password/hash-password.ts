import bcrypt from 'bcrypt';

const BCRYPT_COST_FACTOR = 12;
const BCRYPT_MAX_PASSWORD_BYTES = 72;

export async function hashPassword(password: string): Promise<string> {
  if (!password || Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES) {
    throw new RangeError('Password must contain between 1 and 72 UTF-8 bytes.');
  }

  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}
