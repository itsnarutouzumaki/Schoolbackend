import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  getJwtSecret,
} from './jwt-config.js';
import { authRoles, type AccessTokenClaims } from './access-token.types.js';

function isAccessTokenClaims(payload: string | jwt.JwtPayload): payload is AccessTokenClaims {
  if (typeof payload === 'string') {
    return false;
  }

  return typeof payload.sub === 'string'
    && typeof payload.schoolId === 'string'
    && typeof payload.sessionId === 'string'
    && typeof payload.authVersion === 'number'
    && Number.isInteger(payload.authVersion)
    && payload.authVersion >= 0
    && authRoles.includes(payload.role as AccessTokenClaims['role'])
    && payload.role === payload.appAudience
    && payload.tokenUse === 'access'
    && typeof payload.iat === 'number'
    && typeof payload.exp === 'number'
    && payload.exp - payload.iat === ACCESS_TOKEN_TTL_SECONDS
    && payload.iss === JWT_ISSUER
    && payload.aud === JWT_AUDIENCE;
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });

  if (!isAccessTokenClaims(payload)) {
    throw new jwt.JsonWebTokenError('Access token claims are invalid.');
  }

  return payload;
}
