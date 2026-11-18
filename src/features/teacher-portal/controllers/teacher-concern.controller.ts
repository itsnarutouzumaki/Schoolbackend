import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';
import { ApiError } from '../../../shared/errors/index.js';
import { requireAuthContext } from '../../../shared/http/index.js';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  RequestLocals,
  TypedController,
} from '../../../shared/http/index.js';
import {
  completeGuardianUpload,
  createGuardianUploadIntent,
} from '../../files/services/index.js';
import { sendTeacherConcern } from '../services/index.js';

type Controller = TypedController<
  ParamsDictionary,
  ApiSuccessResponse<unknown> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>;

const concernSchema = z.object({
  recipient: z.enum(['schoolAdmin', 'guardian']),
  studentNumber: z.string().trim().min(1).max(7).optional(),
  subject: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  attachmentFileId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict().superRefine((value, context) => {
  if (value.recipient === 'guardian' && !value.studentNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A student number is required to contact a parent or guardian.',
      path: ['studentNumber'],
    });
  }
  if (value.recipient === 'schoolAdmin' && value.studentNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A student number is not needed to contact School Administration.',
      path: ['studentNumber'],
    });
  }
});

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255).refine(name => !/[\\/\u0000-\u001f]/.test(name)),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  sizeBytes: z.number().int().positive().max(1024 * 1024),
}).strict();

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'REQUEST_INVALID', 'The request body is invalid.');
  }
  return parsed.data;
}

export const sendTeacherConcernController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await sendTeacherConcern({
    ...parseBody(concernSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(201).json({ data });
};

export const createTeacherConcernUploadIntentController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const body = parseBody(uploadSchema, request.body);
  const data = await createGuardianUploadIntent({
    ...body,
    schoolId: auth.schoolId,
    userId: auth.userId,
    ownerType: 'teachers',
    purpose: 'complaint-attachment',
  });
  response.status(201).json({ data });
};

export const completeTeacherConcernUploadController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await completeGuardianUpload({
    fileId: typeof request.params.fileId === 'string' ? request.params.fileId : '',
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};
