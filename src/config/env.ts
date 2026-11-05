import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().url().optional(),
  CORS_ORIGINS: z.string().default(''),
  GCS_BUCKET_NAME: z.string().min(3).optional(),
  GCS_PROJECT_ID: z.string().min(1).optional(),
  GCS_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  JWT_SECRET: z.string()
    .refine(secret => Buffer.byteLength(secret, 'utf8') >= 32, 'JWT_SECRET must be at least 32 bytes.')
    .optional(),
  OTP_HMAC_SECRET: z.string()
    .refine(secret => Buffer.byteLength(secret, 'utf8') >= 32, 'OTP_HMAC_SECRET must be at least 32 bytes.')
    .optional(),
}).superRefine((config, context) => {
  if (config.NODE_ENV === 'production' && !config.JWT_SECRET) {
    context.addIssue({
      code: 'custom',
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET is required in production.',
    });
  }
  if (config.NODE_ENV === 'production' && !config.OTP_HMAC_SECRET) {
    context.addIssue({
      code: 'custom',
      path: ['OTP_HMAC_SECRET'],
      message: 'OTP_HMAC_SECRET is required in production.',
    });
  }
  if (config.NODE_ENV === 'production' && !config.GCS_BUCKET_NAME) {
    context.addIssue({
      code: 'custom',
      path: ['GCS_BUCKET_NAME'],
      message: 'GCS_BUCKET_NAME is required in production.',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid backend environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Backend environment configuration is invalid.');
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
