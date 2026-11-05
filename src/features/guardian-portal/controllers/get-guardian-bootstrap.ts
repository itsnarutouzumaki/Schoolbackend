import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { requireAuthContext } from '../../../shared/http/index.js';
import type { ApiSuccessResponse, RequestLocals, TypedController } from '../../../shared/http/index.js';
import { getGuardianBootstrap } from '../services/index.js';

type Bootstrap = Awaited<ReturnType<typeof getGuardianBootstrap>>;

export const getGuardianBootstrapController: TypedController<
  ParamsDictionary,
  ApiSuccessResponse<Bootstrap>,
  unknown,
  ParsedQs,
  RequestLocals
> = async (_request, response) => {
  const auth = requireAuthContext(response.locals);
  const data = await getGuardianBootstrap({
    schoolId: auth.schoolId,
    userId: auth.userId,
  });
  response.status(200).json({ data });
};
