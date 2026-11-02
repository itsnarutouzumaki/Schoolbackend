import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  getJwtSecret,
} from './jwt-config.js';
import type { AccessTokenInput } from './access-token.types.js';

export function issueAccessToken(claims: AccessTokenInput): string {
  if (claims.role !== claims.appAudience) {
    throw new TypeError('Access token role must match its app audience.');
  }

  return jwt.sign(claims, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
  });
}
