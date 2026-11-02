export type ApiSuccessResponse<TData> = {
  data: TData;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId: string;
    retryable: boolean;
  };
};

export type RequestLocals = Record<string, unknown> & {
  requestId: string;
  tenant?: TenantContext;
  auth?: AuthContext;
};

export type TenantContext = {
  schoolId: string;
  schoolCode: string;
  timezone: string;
};

export type AuthContext = {
  userId: string;
  schoolId: string;
  role: 'guardian' | 'teacher' | 'schoolAdmin';
  appAudience: 'guardian' | 'teacher' | 'schoolAdmin';
  sessionId: string;
  authVersion: number;
};
