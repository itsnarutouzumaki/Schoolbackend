import { ApiError } from '../../../../shared/errors/index.js';
import {
  clearFailedLogin,
  createRefreshSession,
  findUserForLogin,
  getRoleProfile,
  incrementFailedLogin,
} from '../../repositories/index.js';
import { verifyPassword } from '../password/index.js';
import { createRefreshToken, issueAccessToken, issuePasswordChangeToken } from '../tokens/index.js';
import { normalizePhone } from './phone.js';
import type { LoginInput } from '../../validations/index.js';

export async function login(input: LoginInput & { schoolId: string }) {
  const user = await findUserForLogin({
    schoolId: input.schoolId,
    phone: normalizePhone(input.phone),
    role: input.appAudience,
  });
  const now = new Date();
  const genericError = () => new ApiError(401, 'INVALID_CREDENTIALS', 'The supplied credentials are not valid.');

  if (!user || user.status !== 'active') {
    throw genericError();
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    throw genericError();
  }
  if (input.appAudience === 'guardian' && !user.phoneVerifiedAt) {
    throw genericError();
  }
  if (!await verifyPassword(input.password, user.passwordHash)) {
    await incrementFailedLogin(user._id.toString(), input.schoolId);
    throw genericError();
  }
  if (user.role !== input.appAudience) {
    throw genericError();
  }

  await clearFailedLogin(user._id.toString(), input.schoolId);
  const profile = await getRoleProfile(user._id.toString(), input.schoolId, user.role);
  if (!profile) {
    throw new ApiError(403, 'ACCOUNT_PROFILE_UNAVAILABLE', 'The account profile is not available.');
  }

  if (user.mustChangePassword) {
    return {
      accessToken: issuePasswordChangeToken({
        sub: user._id.toString(),
        schoolId: input.schoolId,
        role: user.role as 'guardian' | 'teacher' | 'schoolAdmin',
        appAudience: input.appAudience,
        authVersion: user.authVersion,
      }),
      expiresIn: 600,
      account: { id: user._id.toString(), role: user.role },
      passwordChangeRequired: true as const,
    };
  }

  const refresh = createRefreshToken(now);
  const sessionId = await createRefreshSession({
    schoolId: input.schoolId,
    userId: user._id.toString(),
    authVersion: user.authVersion,
    appAudience: input.appAudience,
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
  });

  return {
    accessToken: issueAccessToken({
      sub: user._id.toString(),
      schoolId: input.schoolId,
      role: user.role as 'guardian' | 'teacher' | 'schoolAdmin',
      appAudience: input.appAudience,
      sessionId,
      authVersion: user.authVersion,
      tokenUse: 'access',
    }),
    refreshToken: refresh.token,
    expiresIn: 900,
    refreshExpiresAt: refresh.expiresAt.toISOString(),
    account: { id: user._id.toString(), role: user.role, profile },
    passwordChangeRequired: false as const,
  };
}
