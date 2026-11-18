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
  completeTeacherProfilePhotoUpload,
  createTeacherProfilePhotoUploadIntent,
  updateTeacherProfile,
} from '../services/index.js';

type Controller = TypedController<
  ParamsDictionary,
  ApiSuccessResponse<unknown> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>;

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().max(500).optional(),
  awards: z.array(z.string().trim().min(1).max(150)).max(20).optional(),
  profilePhotoFileId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

const profilePhotoUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255).refine(name => !/[\\/\u0000-\u001f]/.test(name)),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
}).strict();

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'REQUEST_INVALID', 'The request body is invalid.');
  }
  return parsed.data;
}

export const updateTeacherProfileController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await updateTeacherProfile({
    ...parseBody(profileSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};

export const createTeacherProfilePhotoUploadIntentController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await createTeacherProfilePhotoUploadIntent({
    ...parseBody(profilePhotoUploadSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(201).json({ data });
};

export const completeTeacherProfilePhotoUploadController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await completeTeacherProfilePhotoUpload({
    fileId: typeof request.params.fileId === 'string' ? request.params.fileId : '',
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};
