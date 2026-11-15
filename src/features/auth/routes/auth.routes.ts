import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { authenticateMiddleware } from '../../../middlewares/authenticate/index.js';
import { requireGuardianMiddleware } from '../../../middlewares/require-guardian/index.js';
import { requireTeacherMiddleware } from '../../../middlewares/require-teacher/index.js';
import { controllerHandler } from '../../../shared/http/index.js';
import { validateBody } from '../../../shared/validation/index.js';
import {
  changePasswordController,
  changeGuardianPasswordController,
  confirmPasswordResetController,
  guardianLoginController,
  teacherLoginController,
  teacherRefreshController,
  changeTeacherPasswordController,
  changeTeacherRequiredPasswordController,
  logoutController,
  refreshController,
  requestPasswordResetController,
  requestSignupCodeController,
  signupController,
} from '../controllers/index.js';
import {
  guardianLoginSchema,
  teacherLoginSchema,
  guardianCurrentPasswordChangeSchema,
  logoutSchema,
  passwordChangeSchema,
  passwordResetConfirmationSchema,
  passwordResetRequestSchema,
  refreshSchema,
  requestSignupCodeSchema,
  signupSchema,
} from '../validations/index.js';

export const authRouter = Router();
export const teacherAuthRouter = Router();

const rateLimitHandler = (_request: unknown, response: {
  locals: { requestId?: unknown };
  status: (statusCode: number) => { json: (body: unknown) => void };
}) => {
  response.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      requestId: response.locals.requestId,
      retryable: true,
    },
  });
};

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
const verificationCodeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
const passwordResetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

authRouter.post(
  '/login',
  loginRateLimit,
  validateBody(guardianLoginSchema),
  controllerHandler(guardianLoginController),
);

const teacherLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

teacherAuthRouter.post(
  '/login',
  teacherLoginRateLimit,
  validateBody(teacherLoginSchema),
  controllerHandler(teacherLoginController),
);
teacherAuthRouter.post(
  '/refresh',
  validateBody(refreshSchema),
  controllerHandler(teacherRefreshController),
);
teacherAuthRouter.post(
  '/password/change',
  validateBody(passwordChangeSchema),
  controllerHandler(changeTeacherRequiredPasswordController),
);
teacherAuthRouter.post(
  '/password/change-current',
  authenticateMiddleware,
  requireTeacherMiddleware,
  validateBody(guardianCurrentPasswordChangeSchema),
  controllerHandler(changeTeacherPasswordController),
);
teacherAuthRouter.post(
  '/logout',
  authenticateMiddleware,
  requireTeacherMiddleware,
  validateBody(logoutSchema),
  controllerHandler(logoutController),
);
authRouter.post(
  '/password/change-current',
  authenticateMiddleware,
  requireGuardianMiddleware,
  validateBody(guardianCurrentPasswordChangeSchema),
  controllerHandler(changeGuardianPasswordController),
);
authRouter.post('/password/change', validateBody(passwordChangeSchema), controllerHandler(changePasswordController));
authRouter.post('/refresh', validateBody(refreshSchema), controllerHandler(refreshController));
authRouter.post('/logout', authenticateMiddleware, validateBody(logoutSchema), controllerHandler(logoutController));
authRouter.post(
  '/signup/verification-codes',
  verificationCodeRateLimit,
  validateBody(requestSignupCodeSchema),
  controllerHandler(requestSignupCodeController),
);
authRouter.post('/signup', validateBody(signupSchema), controllerHandler(signupController));
authRouter.post(
  '/password-reset/requests',
  passwordResetRateLimit,
  validateBody(passwordResetRequestSchema),
  controllerHandler(requestPasswordResetController),
);
authRouter.post(
  '/password-reset/confirmations',
  validateBody(passwordResetConfirmationSchema),
  controllerHandler(confirmPasswordResetController),
);
