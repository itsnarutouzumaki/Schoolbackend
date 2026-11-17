import { GoogleAuth } from 'google-auth-library';
import { env } from '../../../config/env.js';

const messagingScope = 'https://www.googleapis.com/auth/firebase.messaging';

export class FcmDeliveryError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly invalidToken: boolean,
  ) {
    super(message);
    this.name = 'FcmDeliveryError';
  }
}

let googleAuth: GoogleAuth | undefined;

function getGoogleAuth() {
  googleAuth ??= new GoogleAuth({
    scopes: [messagingScope],
    ...(env.FIREBASE_PROJECT_ID ? { projectId: env.FIREBASE_PROJECT_ID } : {}),
  });
  return googleAuth;
}

function getProviderError(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return { code: 'FCM_REQUEST_FAILED', message: 'Firebase notification delivery failed.' };
  }
  const error = payload.error;
  if (!error || typeof error !== 'object') {
    return { code: 'FCM_REQUEST_FAILED', message: 'Firebase notification delivery failed.' };
  }
  const code = 'status' in error && typeof error.status === 'string'
    ? error.status
    : 'FCM_REQUEST_FAILED';
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'Firebase notification delivery failed.';
  return { code, message };
}

export async function sendFcmMessage(message: Record<string, unknown>) {
  const auth = getGoogleAuth();
  const [projectId, client] = await Promise.all([auth.getProjectId(), auth.getClient()]);
  const token = (await client.getAccessToken()).token;
  if (!projectId || !token) {
    throw new Error('Firebase project credentials could not be resolved from Application Default Credentials.');
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (response.ok) {
    return;
  }

  const responseBody = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseBody);
  } catch {
    payload = undefined;
  }
  const providerError = getProviderError(payload);
  throw new FcmDeliveryError(
    providerError.message,
    providerError.code,
    providerError.code === 'UNREGISTERED' || providerError.code === 'INVALID_ARGUMENT',
  );
}
