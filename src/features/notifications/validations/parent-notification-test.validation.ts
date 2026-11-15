import { z } from 'zod';

export const parentNotificationTestSchema = z.object({
  receiverId: z.string().regex(/^[a-f\d]{24}$/i),
  receiverRole: z.enum(['guardian', 'teacher']),
  subject: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  attachmentFileId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict();

export type ParentNotificationTestBody = z.infer<typeof parentNotificationTestSchema>;
