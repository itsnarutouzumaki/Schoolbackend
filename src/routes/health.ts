import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/live', (_request, response) => {
  response.status(200).json({ status: 'live' });
});

healthRouter.get('/ready', (_request, response) => {
  const isMongoReady = Boolean(env.MONGODB_URI) && mongoose.connection.readyState === 1;

  response.status(isMongoReady ? 200 : 503).json({
    status: isMongoReady ? 'ready' : 'not-ready',
    dependencies: { mongodb: isMongoReady ? 'connected' : 'unavailable' },
  });
});
