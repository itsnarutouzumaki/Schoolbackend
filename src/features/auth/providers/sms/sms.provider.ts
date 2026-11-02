import { ApiError } from '../../../../shared/errors/index.js';

export interface SmsProvider {
  sendVerificationCode(input: {
    phone: string;
    code: string;
    purpose: 'guardian-signup-phone' | 'guardian-password-reset';
  }): Promise<void>;
}

export class DisabledSmsProvider implements SmsProvider {
  async sendVerificationCode(): Promise<void> {
    throw new ApiError(
      503,
      'SMS_DELIVERY_UNAVAILABLE',
      'Phone verification is temporarily unavailable.',
      true,
    );
  }
}

export const smsProvider: SmsProvider = new DisabledSmsProvider();
