import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { RefreshSessionModel, UserModel } from '../../features/auth/models/index.js';
import { verifyAccessToken } from '../../features/auth/services/tokens/index.js';
import { ApiError } from '../../shared/errors/index.js';
import type { ApiErrorResponse, RequestLocals } from '../../shared/http/index.js';

export const authenticateMiddleware: RequestHandler<
  ParamsDictionary,
  ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response, next) => {
  const tenant = response.locals.tenant;
  if (!tenant) {
    next(new Error('Tenant resolution middleware must run before authentication.'));
    return;
  }

  const authorization = request.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
    return;
  }

  try {
    const claims = verifyAccessToken(authorization.slice('Bearer '.length).trim());
    if (claims.schoolId !== tenant.schoolId) {
      next(new ApiError(403, 'TENANT_MISMATCH', 'This request is not available for the selected school.'));
      return;
    }

    const [user, session] = await Promise.all([
      UserModel.findOne({
        _id: claims.sub,
        schoolId: tenant.schoolId,
        status: 'active',
        mustChangePassword: false,
        authVersion: claims.authVersion,
      }).select('_id role').lean(),
      RefreshSessionModel.exists({
        _id: claims.sessionId,
        userId: claims.sub,
        schoolId: tenant.schoolId,
        authVersion: claims.authVersion,
        appAudience: claims.appAudience,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      }),
    ]);

    if (!user || user.role !== claims.role || !session) {
      next(new ApiError(401, 'SESSION_EXPIRED', 'The session is no longer active.'));
      return;
    }

    response.locals.auth = {
      userId: claims.sub,
      schoolId: claims.schoolId,
      role: claims.role,
      appAudience: claims.appAudience,
      sessionId: claims.sessionId,
      authVersion: claims.authVersion,
    };
    next();
  } catch (error) {
    if (error instanceof Error && (
      error.name === 'JsonWebTokenError'
      || error.name === 'TokenExpiredError'
      || error.name === 'NotBeforeError'
    )) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'The access token is invalid or expired.'));
      return;
    }
    next(error);
  }
};
