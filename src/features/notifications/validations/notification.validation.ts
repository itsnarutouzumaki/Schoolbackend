import { z } from 'zod';

export const notificationDeviceRegistrationSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  platform: z.enum(['android', 'ios']),
}).strict();

export const notificationDeviceRemovalSchema = z.object({
  token: z.string().trim().min(1).max(4096),
}).strict();

export type NotificationDeviceRegistrationBody = z.infer<typeof notificationDeviceRegistrationSchema>;
export type NotificationDeviceRemovalBody = z.infer<typeof notificationDeviceRemovalSchema>;
