import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { z } from 'zod';
import { ApiError } from '../errors/index.js';

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
): RequestHandler<ParamsDictionary, unknown, z.output<TSchema>, ParsedQs> {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new ApiError(400, 'VALIDATION_ERROR', 'The request body is invalid.'));
      return;
    }
    request.body = result.data;
    next();
  };
}
