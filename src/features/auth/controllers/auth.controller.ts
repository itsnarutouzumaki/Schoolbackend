import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { ApiSuccessResponse, RequestLocals, TypedController } from '../../../shared/http/index.js';
import { requireAuthContext, requireTenantContext } from '../../../shared/http/index.js';
import { ApiError } from '../../../shared/errors/index.js';
import { changeRequiredPassword } from '../services/auth/change-password.js';
import { changeGuardianPassword } from '../services/auth/change-guardian-password.js';
import { confirmGuardianPasswordReset } from '../services/auth/confirm-password-reset.js';
import { login } from '../services/auth/login.js';
import { logout } from '../services/auth/logout.js';
import { refreshSession } from '../services/auth/refresh.js';
import { registerGuardian } from '../services/auth/register-guardian.js';
import { requestGuardianPasswordReset } from '../services/auth/request-password-reset.js';
import { requestGuardianSignupCode } from '../services/auth/request-signup-code.js';
import type {
  GuardianLoginInput,
  LogoutInput,
  PasswordChangeInput,
  PasswordResetConfirmationInput,
  PasswordResetRequestInput,
  RefreshInput,
  RequestSignupCodeInput,
  SignupInput,
} from '../validations/index.js';

type Controller<TBody, TData> = TypedController<
  ParamsDictionary,
  ApiSuccessResponse<TData>,
  TBody,
  ParsedQs,
  RequestLocals
>;

export const guardianLoginController: Controller<
  GuardianLoginInput,
  Awaited<ReturnType<typeof login>>
> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  const result = await login({
    ...request.body,
    appAudience: 'guardian',
    schoolId: tenant.schoolId,
  });
  response.status(200).json({ data: result });
};

export const refreshController: Controller<RefreshInput, Awaited<ReturnType<typeof refreshSession>>> = async (
  request,
  response,
) => {
  const tenant = requireTenantContext(response.locals);
  const result = await refreshSession({ ...request.body, schoolId: tenant.schoolId });
  response.status(200).json({ data: result });
};

export const logoutController: Controller<LogoutInput, never> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  const auth = requireAuthContext(response.locals);
  await logout({
    schoolId: tenant.schoolId,
    userId: auth.userId,
    sessionId: auth.sessionId,
    allDevices: request.body.allDevices,
  });
  response.status(204).end();
};

export const requestSignupCodeController: Controller<
  RequestSignupCodeInput,
  Awaited<ReturnType<typeof requestGuardianSignupCode>>
> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  const result = await requestGuardianSignupCode({ ...request.body, schoolId: tenant.schoolId });
  response.status(202).json({ data: result });
};

export const signupController: Controller<
  SignupInput,
  Awaited<ReturnType<typeof registerGuardian>>
> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  const result = await registerGuardian({ ...request.body, schoolId: tenant.schoolId });
  response.status(201).json({ data: result });
};

export const requestPasswordResetController: Controller<
  PasswordResetRequestInput,
  Awaited<ReturnType<typeof requestGuardianPasswordReset>>
> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  const result = await requestGuardianPasswordReset({ ...request.body, schoolId: tenant.schoolId });
  response.status(202).json({ data: result });
};

export const confirmPasswordResetController: Controller<
  PasswordResetConfirmationInput,
  never
> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  await confirmGuardianPasswordReset({ ...request.body, schoolId: tenant.schoolId });
  response.status(204).end();
};

export const changePasswordController: TypedController<
  ParamsDictionary,
  never,
  PasswordChangeInput,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const tenant = requireTenantContext(response.locals);
  const authorization = request.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Password-change authorization is required.');
  }
  await changeRequiredPassword({
    schoolId: tenant.schoolId,
    token: authorization.slice('Bearer '.length).trim(),
    newPassword: request.body.newPassword,
  });
  response.status(204).end();
};

export const changeGuardianPasswordController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<never>,
  { currentPassword: string; newPassword: string },
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  await changeGuardianPassword({
    schoolId: auth.schoolId,
    userId: auth.userId,
    ...request.body,
  });
  response.status(204).end();
};
