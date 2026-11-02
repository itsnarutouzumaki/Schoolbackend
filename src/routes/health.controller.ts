import mongoose from 'mongoose';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { env } from '../config/index.js';
import type { RequestLocals } from '../shared/http/index.js';
import type { TypedController } from '../shared/http/index.js';

type LivenessResponse = {
  status: 'live';
};

type ReadinessResponse =
  | {
    status: 'ready';
    dependencies: { mongodb: 'connected' };
  }
  | {
    status: 'not-ready';
    dependencies: { mongodb: 'unavailable' };
  };

type HealthController<TResponse> = TypedController<
  ParamsDictionary,
  TResponse,
  unknown,
  ParsedQs,
  RequestLocals
>;

export const getLiveness: HealthController<LivenessResponse> = (_request, response) => {
  response.status(200).json({ status: 'live' });
};

export const getReadiness: HealthController<ReadinessResponse> = (_request, response) => {
  const isMongoReady = Boolean(env.MONGODB_URI) && mongoose.connection.readyState === 1;
  const statusCode = isMongoReady ? 200 : 503;
  const body: ReadinessResponse = isMongoReady
    ? { status: 'ready', dependencies: { mongodb: 'connected' } }
    : { status: 'not-ready', dependencies: { mongodb: 'unavailable' } };

  response.status(statusCode).json(body);
};
