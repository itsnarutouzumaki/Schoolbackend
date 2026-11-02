import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().url().optional(),
  CORS_ORIGINS: z.string().default(''),
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
