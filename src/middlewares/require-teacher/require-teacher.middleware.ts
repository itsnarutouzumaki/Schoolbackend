import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../shared/errors/index.js';
import type { ApiErrorResponse, RequestLocals } from '../../shared/http/index.js';

export const requireTeacherMiddleware: RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = (_request, response, next) => {
  const auth = response.locals.auth;
  if (!auth || auth.role !== 'teacher' || auth.appAudience !== 'teacher') {
    next(new ApiError(403, 'ROLE_FORBIDDEN', 'This endpoint is available to teacher accounts only.'));
    return;
  }
  next();
};
