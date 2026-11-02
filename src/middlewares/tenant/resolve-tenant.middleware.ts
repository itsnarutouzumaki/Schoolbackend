import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { BlockedSchoolModel, SchoolModel } from '../../features/tenant/index.js';
import { ApiError } from '../../shared/errors/index.js';
import type { ApiErrorResponse, RequestLocals } from '../../shared/http/index.js';
import mongoose from 'mongoose';

const SCHOOL_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,63}$/;

export const resolveTenantMiddleware: RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response, next) => {
  const rawSchoolCode = request.get('X-School-Code');
  if (!rawSchoolCode) {
    next(new ApiError(400, 'SCHOOL_CODE_REQUIRED', 'The X-School-Code header is required.'));
    return;
  }

  const schoolCode = rawSchoolCode.trim().toUpperCase();
  if (!SCHOOL_CODE_PATTERN.test(schoolCode)) {
    next(new ApiError(400, 'SCHOOL_CODE_INVALID', 'The selected school code is invalid.'));
    return;
  }

  if (mongoose.connection.readyState !== 1) {
    next(new ApiError(
      503,
      'SCHOOL_ACCESS_CHECK_UNAVAILABLE',
      'School access cannot be verified right now.',
      true,
    ));
    return;
  }

  try {
    const block = await BlockedSchoolModel.exists({ schoolCode }).read('primary');
    if (block) {
      next(new ApiError(403, 'SCHOOL_UNAVAILABLE', 'This school is currently unavailable.'));
      return;
    }

    const school = await SchoolModel.findOne({ code: schoolCode })
      .select('_id code status timezone')
      .read('primary')
      .lean();
    if (!school) {
      next(new ApiError(404, 'SCHOOL_NOT_FOUND', 'The selected school was not found.'));
      return;
    }
    if (school.status !== 'active') {
      next(new ApiError(403, 'SCHOOL_UNAVAILABLE', 'This school is currently unavailable.'));
      return;
    }

    response.locals.tenant = {
      schoolId: school._id.toString(),
      schoolCode: school.code,
      timezone: school.timezone,
    };
    next();
  } catch (error) {
    next(error);
  }
};
