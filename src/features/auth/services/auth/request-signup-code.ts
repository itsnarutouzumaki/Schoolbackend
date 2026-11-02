import { randomUUID } from 'node:crypto';
import { ApiError } from '../../../../shared/errors/index.js';
import {
  createAuthChallenge,
  setChallengeDeliveryStatus,
} from '../../repositories/index.js';
import { smsProvider } from '../../providers/sms/index.js';
import { generateOtp, hashOtp } from '../tokens/index.js';
import { normalizePhone } from './phone.js';

export async function requestGuardianSignupCode(input: {
  schoolId: string;
  phone: string;
}): Promise<{ challengeId: string; expiresIn: number }> {
  const phone = normalizePhone(input.phone);
  const challengeId = randomUUID();
  const purpose = 'guardian-signup-phone';
  const code = generateOtp();
  await createAuthChallenge({
    schoolId: input.schoolId,
    phone,
    purpose,
    challengeId,
    codeHash: hashOtp({ schoolId: input.schoolId, challengeId, purpose, code }),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    deliveryStatus: 'pending',
  });

  try {
    await smsProvider.sendVerificationCode({ phone, code, purpose });
    await setChallengeDeliveryStatus(input.schoolId, challengeId, 'sent');
  } catch (error) {
    await setChallengeDeliveryStatus(input.schoolId, challengeId, 'failed');
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(503, 'SMS_DELIVERY_UNAVAILABLE', 'Phone verification is temporarily unavailable.', true);
  }

  return { challengeId, expiresIn: 300 };
}
