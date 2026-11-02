import type { ErrorRequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { ApiErrorResponse, RequestLocals } from '../shared/http/index.js';
import { ApiError } from '../shared/errors/index.js';

function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  return typeof error;
}

function getRequestParsingError(error: unknown): ApiError | undefined {
  if (!error || typeof error !== 'object' || !('type' in error)) {
    return undefined;
  }

  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body exceeds the allowed size.');
  }
  if (error.type === 'entity.parse.failed') {
    return new ApiError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = (error: unknown, _request, response, _next) => {
  const requestId = response.locals.requestId;
  const normalizedError = error instanceof ApiError
    ? error
    : getRequestParsingError(error);

  if (!normalizedError) {
    console.error('Unhandled API request error.', {
      requestId,
      errorName: getErrorName(error),
    });
  }

  const apiError = normalizedError ?? new ApiError(
    500,
    'INTERNAL_SERVER_ERROR',
    'The server could not complete the request.',
    true,
  );

  response.status(apiError.statusCode).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      requestId,
      retryable: apiError.retryable,
    },
  });
};
