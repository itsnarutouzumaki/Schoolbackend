import { ApiError } from '../../../../shared/errors/index.js';
import {
  getChallenge,
  incrementChallengeAttempt,
  resetGuardianPassword,
} from '../../repositories/index.js';
import { hashPassword } from '../password/index.js';
import { compareOtpHash, hashOtp } from '../tokens/index.js';
import { normalizePhone } from './phone.js';

export async function confirmGuardianPasswordReset(input: {
  schoolId: string;
  challengeId: string;
  verificationCode: string;
  newPassword: string;
}): Promise<void> {
  const invalid = () => new ApiError(400, 'RESET_NOT_VALID', 'The recovery code is invalid or expired.');
  const challenge = await getChallenge(input.schoolId, input.challengeId, 'guardian-password-reset');
  if (!challenge || challenge.deliveryStatus !== 'sent') {
    throw invalid();
  }

  const codeHash = hashOtp({
    schoolId: input.schoolId,
    challengeId: input.challengeId,
    purpose: 'guardian-password-reset',
    code: input.verificationCode,
  });
  if (!compareOtpHash(challenge.codeHash, codeHash)) {
    await incrementChallengeAttempt(input.schoolId, input.challengeId);
    throw invalid();
  }

  const passwordHash = await hashPassword(input.newPassword);
  const reset = await resetGuardianPassword({
    schoolId: input.schoolId,
    phone: normalizePhone(challenge.normalizedPhone),
    challengeId: input.challengeId,
    codeHash,
    passwordHash,
    now: new Date(),
  });
  if (!reset) {
    throw invalid();
  }
}
