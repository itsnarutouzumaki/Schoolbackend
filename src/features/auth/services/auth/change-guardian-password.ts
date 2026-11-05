import { ApiError } from '../../../../shared/errors/index.js';
import { Buffer } from 'node:buffer';
import { UserModel } from '../../models/index.js';
import { updatePassword } from '../../repositories/index.js';
import { hashPassword, verifyPassword } from '../password/index.js';

export async function changeGuardianPassword(input: {
  schoolId: string;
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  if (Buffer.byteLength(input.currentPassword, 'utf8') > 72
    || Buffer.byteLength(input.newPassword, 'utf8') > 72) {
    throw new ApiError(400, 'PASSWORD_LENGTH_INVALID', 'Passwords must not exceed 72 bytes.');
  }
  const user = await UserModel.findOne({
    _id: input.userId,
    schoolId: input.schoolId,
    role: 'guardian',
    status: 'active',
    mustChangePassword: false,
  }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'The account session is no longer active.');
  }
  if (!await verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new ApiError(401, 'PASSWORD_INVALID', 'The current password is not correct.');
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new ApiError(400, 'PASSWORD_UNCHANGED', 'Choose a password different from the current password.');
  }

  const changed = await updatePassword(
    input.schoolId,
    input.userId,
    await hashPassword(input.newPassword),
  );
  if (!changed) {
    throw new ApiError(409, 'PASSWORD_CHANGE_CONFLICT', 'The password could not be changed.');
  }
}
