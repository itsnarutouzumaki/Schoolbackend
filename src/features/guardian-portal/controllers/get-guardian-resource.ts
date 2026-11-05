import type { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { Types } from 'mongoose';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../../shared/errors/index.js';
import { requireAuthContext } from '../../../shared/http/index.js';
import type { ApiErrorResponse, ApiSuccessResponse, RequestLocals } from '../../../shared/http/index.js';
import { getGuardianBootstrap } from '../services/index.js';

export type GuardianReadResource =
  | 'profile'
  | 'children'
  | 'childLinkRequests'
  | 'leaveRequests'
  | 'complaints'
  | 'notifications'
  | 'attendance'
  | 'results'
  | 'fees'
  | 'teachers';

export function getGuardianResource(resource: GuardianReadResource) {
  return async (
    request: Request<ParamsDictionary, ApiSuccessResponse<unknown> | ApiErrorResponse, unknown, ParsedQs, RequestLocals>,
    response: Response<ApiSuccessResponse<unknown> | ApiErrorResponse, RequestLocals>,
    next: NextFunction,
  ) => {
    try {
      const auth = requireAuthContext(response.locals);
      const snapshot = await getGuardianBootstrap({
        schoolId: auth.schoolId,
        userId: auth.userId,
      });
      let data: unknown;
      if (resource === 'profile') data = snapshot.account.profile;
      else if (resource === 'children') data = snapshot.children;
      else if (resource === 'childLinkRequests') data = snapshot.childLinkRequests;
      else if (resource === 'leaveRequests') data = snapshot.leaveRequests;
      else if (resource === 'complaints') data = snapshot.complaints;
      else if (resource === 'notifications') data = snapshot.notifications;
      else {
        const childId = request.params.childId;
        if (typeof childId !== 'string' || !Types.ObjectId.isValid(childId)) {
          throw new ApiError(400, 'CHILD_ID_INVALID', 'A valid linked child ID is required.');
        }
        const child = snapshot.children.find(item => item.id === childId);
        if (!child) {
          throw new ApiError(404, 'CHILD_NOT_FOUND', 'The linked child was not found.');
        }
        if (resource === 'attendance') data = child.attendance;
        else if (resource === 'results') {
          data = {
            assessments: child.publishedAssessments,
            results: child.results,
          };
        } else if (resource === 'fees') data = child.feeReceipts;
        else data = child.teachers;
      }
      response.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  };
}
