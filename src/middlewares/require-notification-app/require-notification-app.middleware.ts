import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../shared/errors/index.js';
import type { ApiErrorResponse, RequestLocals } from '../../shared/http/index.js';

export const requireNotificationAppMiddleware: RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = (_request, response, next) => {
  const auth = response.locals.auth;
  if (
    !auth
    || (auth.role !== 'guardian' && auth.role !== 'teacher')
    || auth.appAudience !== auth.role
  ) {
    next(new ApiError(403, 'ROLE_FORBIDDEN', 'This endpoint is available to Parent and Teacher accounts only.'));
    return;
  }
  next();
};
