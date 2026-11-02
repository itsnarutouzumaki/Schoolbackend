import type {
  NextFunction,
  Request,
  Response,
} from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export type TypedController<
  TParams extends ParamsDictionary = ParamsDictionary,
  TResponseBody = unknown,
  TRequestBody = unknown,
  TRequestQuery extends ParsedQs = ParsedQs,
  TLocals extends Record<string, unknown> = Record<string, unknown>,
> = (
  request: Request<TParams, TResponseBody, TRequestBody, TRequestQuery, TLocals>,
  response: Response<TResponseBody, TLocals>,
  next: NextFunction,
) => void | Promise<void>;
