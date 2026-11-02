import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { TypedController } from './controller.types.js';

export function controllerHandler<
  TParams extends ParamsDictionary,
  TResponseBody,
  TRequestBody,
  TRequestQuery extends ParsedQs,
  TLocals extends Record<string, unknown>,
>(
  controller: TypedController<
    TParams,
    TResponseBody,
    TRequestBody,
    TRequestQuery,
    TLocals
  >,
): RequestHandler<
  TParams,
  TResponseBody,
  TRequestBody,
  TRequestQuery,
  TLocals
> {
  return (request, response, next) => {
    Promise.resolve(controller(request, response, next)).catch(next);
  };
}
