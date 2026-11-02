import type { Response } from 'express';
import type { ApiSuccessResponse } from './api-response.types.js';

export type SuccessStatusCode = 200 | 201 | 202;

export function sendSuccess<TData, TLocals extends Record<string, unknown>>(
  response: Response<ApiSuccessResponse<TData>, TLocals>,
  data: TData,
  statusCode: SuccessStatusCode = 200,
): void {
  response.status(statusCode).json({ data });
}
