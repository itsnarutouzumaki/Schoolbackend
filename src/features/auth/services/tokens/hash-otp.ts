import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { getOtpHmacSecret } from './jwt-config.js';

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(input: {
  schoolId: string;
  challengeId: string;
  purpose: string;
  code: string;
}): string {
  return createHmac('sha256', getOtpHmacSecret())
    .update(`${input.schoolId}:${input.challengeId}:${input.purpose}:${input.code}`)
    .digest('hex');
}

export function compareOtpHash(expectedHash: string, candidateHash: string): boolean {
  const expected = Buffer.from(expectedHash, 'hex');
  const candidate = Buffer.from(candidateHash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
