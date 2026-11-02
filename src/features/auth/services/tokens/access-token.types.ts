export const authRoles = ['guardian', 'teacher', 'schoolAdmin'] as const;
export type AuthRole = typeof authRoles[number];

export type AccessTokenInput = {
  sub: string;
  schoolId: string;
  role: AuthRole;
  appAudience: AuthRole;
  sessionId: string;
  authVersion: number;
  tokenUse: 'access';
};

export type AccessTokenClaims = AccessTokenInput & {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};
