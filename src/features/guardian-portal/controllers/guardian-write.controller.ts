import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';
import { ApiError } from '../../../shared/errors/index.js';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  RequestLocals,
  TypedController,
} from '../../../shared/http/index.js';
import { requireAuthContext } from '../../../shared/http/index.js';
import {
  createChildLinkRequest,
  createComplaint,
  createLeaveRequest,
  markGuardianNotification,
  updateGuardianProfile,
} from '../../guardian-services/services/index.js';
import {
  completeGuardianUpload,
  createGuardianDownloadUrl,
  createGuardianUploadIntent,
} from '../../files/services/index.js';

type Controller = TypedController<
  ParamsDictionary,
  ApiSuccessResponse<unknown> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>;

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).optional(),
  profilePhotoFileId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict();
const linkRequestSchema = z.object({
  studentNumber: z.string().trim().min(1).max(80),
  studentName: z.string().trim().min(1).max(120).optional(),
  relationship: z.string().trim().min(1).max(80).default('Parent'),
}).strict();
const leaveRequestSchema = z.object({
  childId: z.string().regex(/^[a-f\d]{24}$/i),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(300),
  password: z.string().min(1).max(72),
  fileIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(1).default([]),
}).strict();
const complaintSchema = z.object({
  childId: z.string().regex(/^[a-f\d]{24}$/i),
  subject: z.string().trim().min(1).max(200).default('General'),
  message: z.string().trim().min(8).max(1000),
  attachmentFileIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(1).default([]),
}).strict();
const uploadIntentSchema = z.object({
  purpose: z.enum(['profile-photo', 'complaint-attachment', 'leave-attachment']),
  fileName: z.string().trim().min(1).max(255).refine(name => !/[\\/\u0000-\u001f]/.test(name)),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
}).strict();

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'REQUEST_INVALID', 'The request body is invalid.');
  }
  return parsed.data;
}

export const updateGuardianProfileController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await updateGuardianProfile({
    ...parseBody(profileSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};

export const createGuardianChildLinkRequestController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await createChildLinkRequest({
    ...parseBody(linkRequestSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(202).json({ data });
};

export const createGuardianLeaveRequestController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await createLeaveRequest({
    ...parseBody(leaveRequestSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(201).json({ data });
};

export const createGuardianComplaintController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await createComplaint({
    ...parseBody(complaintSchema, request.body),
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(201).json({ data });
};

export const markGuardianNotificationController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await markGuardianNotification({
    schoolId: auth.schoolId,
    userId: auth.userId,
    eventId: typeof request.params.eventId === 'string' ? request.params.eventId : undefined,
    markAll: request.path.endsWith('/read-all'),
  });
  response.status(200).json({ data });
};

export const createGuardianUploadIntentController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const body = parseBody(uploadIntentSchema, request.body);
  const data = await createGuardianUploadIntent({
    ...body,
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(201).json({ data });
};

export const completeGuardianUploadController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await completeGuardianUpload({
    fileId: typeof request.params.fileId === 'string' ? request.params.fileId : '',
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};

export const createGuardianDownloadUrlController: Controller = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await createGuardianDownloadUrl({
    fileId: typeof request.params.fileId === 'string' ? request.params.fileId : '',
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};
