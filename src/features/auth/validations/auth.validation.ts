import { z } from 'zod';

const passwordSchema = z.string()
  .min(8)
  .max(72)
  .refine(password => Buffer.byteLength(password, 'utf8') <= 72);
const phoneSchema = z.string()
  .trim()
  .min(8)
  .max(24)
  .regex(/^[+0-9(). -]+$/)
  .refine(phone => phone.replace(/\D/g, '').length >= 8 && phone.replace(/\D/g, '').length <= 15);

export const loginSchema = z.object({
  appAudience: z.enum(['guardian', 'teacher', 'schoolAdmin']),
  phone: phoneSchema,
  password: passwordSchema,
}).strict();
export const guardianLoginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
}).strict();

export const passwordChangeSchema = z.object({
  newPassword: passwordSchema,
}).strict();
export const guardianCurrentPasswordChangeSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(128),
}).strict();

export const logoutSchema = z.object({
  allDevices: z.boolean().optional().default(false),
}).strict().default({ allDevices: false });

export const requestSignupCodeSchema = z.object({
  phone: phoneSchema,
}).strict();

export const signupSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.string().trim().email().max(254).optional(),
  password: passwordSchema,
  challengeId: z.string().uuid(),
  verificationCode: z.string().regex(/^\d{6}$/),
}).strict();

export const passwordResetRequestSchema = z.object({
  appAudience: z.literal('guardian'),
  phone: phoneSchema,
}).strict();

export const passwordResetConfirmationSchema = z.object({
  challengeId: z.string().uuid(),
  verificationCode: z.string().regex(/^\d{6}$/),
  newPassword: passwordSchema,
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type GuardianLoginInput = z.infer<typeof guardianLoginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type GuardianCurrentPasswordChangeInput = z.infer<typeof guardianCurrentPasswordChangeSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type RequestSignupCodeInput = z.infer<typeof requestSignupCodeSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmationInput = z.infer<typeof passwordResetConfirmationSchema>;
