import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../shared/errors/index.js';
import type { ApiErrorResponse, AuthContext, RequestLocals } from '../../shared/http/index.js';

export function requireRoles(
  ...roles: AuthContext['role'][]
): RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> {
  return (_request, response, next) => {
    const auth = response.locals.auth;
    if (!auth) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
      return;
    }
    if (!roles.includes(auth.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'This action is not permitted.'));
      return;
    }
    next();
  };
}
