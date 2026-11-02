import { env } from '../../../../config/index.js';
import { ApiError } from '../../../../shared/errors/index.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_SESSION_TTL_DAYS = 30;
export const JWT_ISSUER = 'greenwood-school-api';
export const JWT_AUDIENCE = 'greenwood-school-clients';
export const JWT_ALGORITHM = 'HS256' as const;
export const PASSWORD_CHANGE_TOKEN_TTL_SECONDS = 10 * 60;

export function getJwtSecret(): string {
  const secret = env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is temporarily unavailable.', true);
  }
  return secret;
}

export function getOtpHmacSecret(): string {
  const secret = env.OTP_HMAC_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is temporarily unavailable.', true);
  }
  return secret;
}
