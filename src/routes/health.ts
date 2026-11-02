import { Router } from 'express';
import { controllerHandler } from '../shared/http/index.js';
import { getLiveness, getReadiness } from './health.controller.js';

export const healthRouter = Router();

healthRouter.get('/live', controllerHandler(getLiveness));
healthRouter.get('/ready', controllerHandler(getReadiness));
