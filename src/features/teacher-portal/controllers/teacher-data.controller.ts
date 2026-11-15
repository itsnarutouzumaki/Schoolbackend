import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { ApiError } from '../../../shared/errors/index.js';
import { requireAuthContext } from '../../../shared/http/index.js';
import type { ApiSuccessResponse, RequestLocals, TypedController } from '../../../shared/http/index.js';
import { findTeacherStudent, getTeacherBootstrap, getTeacherClassStudents } from '../services/index.js';

type Bootstrap = Awaited<ReturnType<typeof getTeacherBootstrap>>;
type ClassStudents = Awaited<ReturnType<typeof getTeacherClassStudents>>;
type Student = Awaited<ReturnType<typeof findTeacherStudent>>;
type SectionParams = { classSectionId: string };

export const getTeacherBootstrapController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<Bootstrap>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (_request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await getTeacherBootstrap({ schoolId: auth.schoolId, userId: auth.userId });
  response.status(200).json({ data });
};

export const getTeacherClassStudentsController: TypedController<
  SectionParams,
  ApiSuccessResponse<ClassStudents>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await getTeacherClassStudents({
    schoolId: auth.schoolId,
    userId: auth.userId,
    classSectionId: request.params.classSectionId,
  });
  response.status(200).json({ data });
};

export const findTeacherStudentController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<Student>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (request, response) => {
  const auth = requireAuthContext(response.locals);
  const studentNumber = request.query.studentNumber;
  if (typeof studentNumber !== 'string' || studentNumber.length > 7) {
    throw new ApiError(400, 'STUDENT_NUMBER_INVALID', 'A valid student number is required.');
  }
  const data = await findTeacherStudent({
    schoolId: auth.schoolId,
    userId: auth.userId,
    studentNumber,
  });
  response.status(200).json({ data });
};
