import jwt from 'jsonwebtoken';
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  PASSWORD_CHANGE_TOKEN_TTL_SECONDS,
  getJwtSecret,
} from './jwt-config.js';
import type { AuthRole } from './access-token.types.js';

export function issuePasswordChangeToken(input: {
  sub: string;
  schoolId: string;
  role: AuthRole;
  appAudience: AuthRole;
  authVersion: number;
}): string {
  return jwt.sign({ ...input, tokenUse: 'password-change' }, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: PASSWORD_CHANGE_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
  });
}
