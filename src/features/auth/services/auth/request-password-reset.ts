import { randomUUID } from 'node:crypto';
import {
  createAuthChallenge,
  getActiveGuardianForReset,
  setChallengeDeliveryStatus,
} from '../../repositories/index.js';
import { smsProvider } from '../../providers/sms/index.js';
import { generateOtp, hashOtp } from '../tokens/index.js';
import { getOtpHmacSecret } from '../tokens/jwt-config.js';
import { normalizePhone } from './phone.js';

const genericResult = {
  expiresIn: 300,
  message: 'If the account is eligible, recovery instructions will be sent.',
};

export async function requestGuardianPasswordReset(input: {
  schoolId: string;
  phone: string;
}): Promise<{ challengeId: string; expiresIn: number; message: string }> {
  getOtpHmacSecret();
  const phone = normalizePhone(input.phone);
  const user = await getActiveGuardianForReset(input.schoolId, phone);
  if (!user) {
    return { challengeId: randomUUID(), ...genericResult };
  }

  const challengeId = randomUUID();
  const purpose = 'guardian-password-reset';
  const code = generateOtp();
  await createAuthChallenge({
    schoolId: input.schoolId,
    phone,
    purpose,
    challengeId,
    codeHash: hashOtp({ schoolId: input.schoolId, challengeId, purpose, code }),
    expiresAt: new Date(Date.now() + genericResult.expiresIn * 1000),
    deliveryStatus: 'pending',
  });

  try {
    await smsProvider.sendVerificationCode({ phone, code, purpose });
    await setChallengeDeliveryStatus(input.schoolId, challengeId, 'sent');
  } catch {
    await setChallengeDeliveryStatus(input.schoolId, challengeId, 'failed');
  }

  return { challengeId, ...genericResult };
}
