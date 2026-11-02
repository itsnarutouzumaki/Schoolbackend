import bcrypt from 'bcrypt';

const BCRYPT_MAX_PASSWORD_BYTES = 72;

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_PASSWORD_BYTES) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}
