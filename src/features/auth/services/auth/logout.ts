import {
  revokeSession,
  revokeUserSessions,
} from '../../repositories/index.js';

export async function logout(input: {
  schoolId: string;
  userId: string;
  sessionId: string;
  allDevices: boolean;
}): Promise<void> {
  const now = new Date();
  if (input.allDevices) {
    await revokeUserSessions(input.userId, input.schoolId, now, 'logout');
    return;
  }
  await revokeSession(input.sessionId, input.schoolId, now);
}
