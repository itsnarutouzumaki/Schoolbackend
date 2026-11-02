import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; readiness will remain unavailable.');
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.info('MongoDB connected.');
  } catch (error) {
    console.error('Initial MongoDB connection failed; readiness will report unavailable.', {
      errorName: error instanceof Error ? error.name : typeof error,
    });
  }
}
