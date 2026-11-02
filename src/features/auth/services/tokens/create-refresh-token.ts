import { createHash, randomBytes } from 'node:crypto';
import { REFRESH_SESSION_TTL_DAYS } from './jwt-config.js';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function createRefreshToken(now = new Date()): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(now.getTime() + REFRESH_SESSION_TTL_DAYS * DAY_IN_MILLISECONDS);

  return { token, tokenHash, expiresAt };
}
