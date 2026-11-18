import type { ParamsDictionary } from 'express-serve-static-core';
import { Router } from 'express';
import type { ParsedQs } from 'qs';
import { authenticateMiddleware } from '../../../middlewares/authenticate/index.js';
import { requireTeacherMiddleware } from '../../../middlewares/require-teacher/index.js';
import { controllerHandler } from '../../../shared/http/index.js';
import type { ApiErrorResponse, ApiSuccessResponse, RequestLocals } from '../../../shared/http/index.js';
import {
  completeTeacherConcernUploadController,
  completeTeacherProfilePhotoUploadController,
  createTeacherConcernUploadIntentController,
  createTeacherProfilePhotoUploadIntentController,
  findTeacherStudentController,
  getTeacherBootstrapController,
  getTeacherClassStudentsController,
  sendTeacherConcernController,
  updateTeacherProfileController,
} from '../controllers/index.js';
import { findTeacherStudent, getTeacherBootstrap, getTeacherClassStudents } from '../services/index.js';

type Bootstrap = Awaited<ReturnType<typeof getTeacherBootstrap>>;
type ClassStudents = Awaited<ReturnType<typeof getTeacherClassStudents>>;
type Student = Awaited<ReturnType<typeof findTeacherStudent>>;
type SectionParams = { classSectionId: string };

export const teacherPortalRouter = Router();

teacherPortalRouter.get<
  ParamsDictionary,
  ApiSuccessResponse<Bootstrap> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>('/bootstrap', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(getTeacherBootstrapController));

teacherPortalRouter.get<
  SectionParams,
  ApiSuccessResponse<ClassStudents> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>('/classes/:classSectionId/students', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(getTeacherClassStudentsController));

teacherPortalRouter.get<
  ParamsDictionary,
  ApiSuccessResponse<Student> | ApiErrorResponse,
  unknown,
  ParsedQs,
  RequestLocals
>('/students', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(findTeacherStudentController));

teacherPortalRouter.patch('/me', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(updateTeacherProfileController));
teacherPortalRouter.post('/profile-photo/upload-intents', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(createTeacherProfilePhotoUploadIntentController));
teacherPortalRouter.post('/profile-photo/:fileId/complete', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(completeTeacherProfilePhotoUploadController));
teacherPortalRouter.post('/concerns', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(sendTeacherConcernController));
teacherPortalRouter.post('/concern-files/upload-intents', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(createTeacherConcernUploadIntentController));
teacherPortalRouter.post('/concern-files/:fileId/complete', authenticateMiddleware, requireTeacherMiddleware, controllerHandler(completeTeacherConcernUploadController));
