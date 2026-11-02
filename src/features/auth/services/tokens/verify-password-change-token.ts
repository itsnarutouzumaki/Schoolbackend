import jwt from 'jsonwebtoken';
import {
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  getJwtSecret,
} from './jwt-config.js';
import { authRoles, type AuthRole } from './access-token.types.js';

export type PasswordChangeClaims = {
  sub: string;
  schoolId: string;
  role: AuthRole;
  appAudience: AuthRole;
  authVersion: number;
  tokenUse: 'password-change';
  exp: number;
};

function isPasswordChangeClaims(payload: string | jwt.JwtPayload): payload is PasswordChangeClaims {
  return typeof payload !== 'string'
    && typeof payload.sub === 'string'
    && typeof payload.schoolId === 'string'
    && typeof payload.authVersion === 'number'
    && Number.isInteger(payload.authVersion)
    && authRoles.includes(payload.role as AuthRole)
    && payload.appAudience === payload.role
    && payload.tokenUse === 'password-change'
    && typeof payload.exp === 'number';
}

export function verifyPasswordChangeToken(token: string): PasswordChangeClaims {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });
  if (!isPasswordChangeClaims(payload)) {
    throw new jwt.JsonWebTokenError('Password change token claims are invalid.');
  }
  return payload;
}
