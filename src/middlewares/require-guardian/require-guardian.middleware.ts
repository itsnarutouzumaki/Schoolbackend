import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../shared/errors/index.js';
import type { ApiErrorResponse, RequestLocals } from '../../shared/http/index.js';

export const requireGuardianMiddleware: RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = (_request, response, next) => {
  const auth = response.locals.auth;
  if (!auth || auth.role !== 'guardian' || auth.appAudience !== 'guardian') {
    next(new ApiError(403, 'ROLE_FORBIDDEN', 'This endpoint is available to guardian accounts only.'));
    return;
  }
  next();
};
