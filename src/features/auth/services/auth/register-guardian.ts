import { ApiError } from '../../../../shared/errors/index.js';
import {
  createGuardianAccount,
  getChallenge,
  incrementChallengeAttempt,
} from '../../repositories/index.js';
import { hashPassword } from '../password/index.js';
import { compareOtpHash, hashOtp } from '../tokens/index.js';
import { normalizePhone } from './phone.js';

export async function registerGuardian(input: {
  schoolId: string;
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  challengeId: string;
  verificationCode: string;
}): Promise<{ guardianId: string; status: 'active' }> {
  const phone = normalizePhone(input.phone);
  const challenge = await getChallenge(input.schoolId, input.challengeId, 'guardian-signup-phone');
  if (!challenge || challenge.normalizedPhone !== phone) {
    throw new ApiError(400, 'VERIFICATION_NOT_VALID', 'The verification code is invalid or expired.');
  }

  const candidateHash = hashOtp({
    schoolId: input.schoolId,
    challengeId: input.challengeId,
    purpose: 'guardian-signup-phone',
    code: input.verificationCode,
  });
  if (!compareOtpHash(challenge.codeHash, candidateHash)) {
    await incrementChallengeAttempt(input.schoolId, input.challengeId);
    throw new ApiError(400, 'VERIFICATION_NOT_VALID', 'The verification code is invalid or expired.');
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const account = await createGuardianAccount({
      schoolId: input.schoolId,
      fullName: input.fullName,
      phone,
      email: input.email?.toLowerCase(),
      passwordHash,
      challengeId: input.challengeId,
      challengeCodeHash: candidateHash,
      verifiedAt: new Date(),
    });
    return { guardianId: account.guardianId, status: 'active' };
  } catch (error) {
    if (error instanceof Error && error.message === 'VERIFICATION_NOT_VALID') {
      throw new ApiError(400, 'VERIFICATION_NOT_VALID', 'The verification code is invalid or expired.');
    }
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      throw new ApiError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account already exists for this phone number.');
    }
    throw error;
  }
}
