import { createHash } from 'node:crypto';
import { ApiError } from '../../../../shared/errors/index.js';
import {
  findRefreshSessionByToken,
  findUserById,
  getRoleProfile,
  revokeSession,
  rotateRefreshSession,
} from '../../repositories/index.js';
import { createRefreshToken, issueAccessToken } from '../tokens/index.js';

export async function refreshSession(input: {
  schoolId: string;
  refreshToken: string;
}) {
  const now = new Date();
  const session = await findRefreshSessionByToken(input.refreshToken);
  if (!session || session.schoolId.toString() !== input.schoolId) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'The refresh session is invalid or expired.');
  }

  const user = await findUserById(input.schoolId, session.userId.toString());
  if (
    !user
    || user.status !== 'active'
    || user.mustChangePassword
    || user.authVersion !== session.authVersion
  ) {
    await revokeSession(session._id.toString(), input.schoolId, now);
    throw new ApiError(401, 'SESSION_EXPIRED', 'The refresh session is invalid or expired.');
  }

  const profile = await getRoleProfile(user._id.toString(), input.schoolId, user.role);
  if (!profile) {
    await revokeSession(session._id.toString(), input.schoolId, now);
    throw new ApiError(401, 'SESSION_EXPIRED', 'The refresh session is invalid or expired.');
  }

  const refresh = createRefreshToken(now);
  const accessToken = issueAccessToken({
    sub: user._id.toString(),
    schoolId: input.schoolId,
    role: user.role as 'guardian' | 'teacher' | 'schoolAdmin',
    appAudience: session.appAudience as 'guardian' | 'teacher' | 'schoolAdmin',
    sessionId: session._id.toString(),
    authVersion: user.authVersion,
    tokenUse: 'access',
  });
  const rotated = await rotateRefreshSession({
    sessionId: session._id.toString(),
    schoolId: input.schoolId,
    userId: user._id.toString(),
    tokenHash: createHash('sha256').update(input.refreshToken).digest('hex'),
    nextTokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
    rotatedAt: now,
  });
  if (!rotated) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'The refresh session is invalid or expired.');
  }

  return {
    accessToken,
    refreshToken: refresh.token,
    expiresIn: 900,
    refreshExpiresAt: refresh.expiresAt.toISOString(),
  };
}
