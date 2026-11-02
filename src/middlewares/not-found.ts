import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../shared/errors/index.js';
import type { ApiErrorResponse, RequestLocals } from '../shared/http/index.js';

export const notFoundHandler: RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = (_request, _response, next) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'The requested API route does not exist.'));
};
