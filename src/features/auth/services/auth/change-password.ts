import { ApiError } from '../../../../shared/errors/index.js';
import { findUserById, updatePassword } from '../../repositories/index.js';
import { hashPassword } from '../password/index.js';
import { verifyPasswordChangeToken } from '../tokens/index.js';

export async function changeRequiredPassword(input: {
  schoolId: string;
  token: string;
  newPassword: string;
}): Promise<void> {
  let claims;
  try {
    claims = verifyPasswordChangeToken(input.token);
  } catch (error) {
    if (error instanceof Error && (
      error.name === 'JsonWebTokenError'
      || error.name === 'TokenExpiredError'
      || error.name === 'NotBeforeError'
    )) {
      throw new ApiError(401, 'PASSWORD_CHANGE_TOKEN_INVALID', 'The password-change session is invalid or expired.');
    }
    throw error;
  }

  if (claims.schoolId !== input.schoolId) {
    throw new ApiError(403, 'TENANT_MISMATCH', 'This request is not available for the selected school.');
  }
  const user = await findUserById(input.schoolId, claims.sub);
  if (
    !user
    || user.status !== 'active'
    || !user.mustChangePassword
    || user.authVersion !== claims.authVersion
  ) {
    throw new ApiError(401, 'PASSWORD_CHANGE_TOKEN_INVALID', 'The password-change session is invalid or expired.');
  }

  const passwordHash = await hashPassword(input.newPassword);
  const changed = await updatePassword(input.schoolId, user._id.toString(), passwordHash);
  if (!changed) {
    throw new ApiError(409, 'PASSWORD_CHANGE_CONFLICT', 'The password could not be changed for this session.');
  }
}
