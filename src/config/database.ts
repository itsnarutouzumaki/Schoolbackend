
import mongoose from 'mongoose';
import { env } from './env.js';

let retryTask: Promise<void> | undefined;

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const safeMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(
    /(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi,
    '$1[REDACTED]@'
  );
};

function watchConnection() {
  mongoose.connection.on('connected', () => {
    console.info('MongoDB connected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.info('MongoDB reconnected.');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  mongoose.connection.on('error', error => {
    console.error('MongoDB connection error.', {
      errorName: error.name,
      errorMessage: safeMessage(error)
    });
  });
}

async function connectWithRetry(): Promise<void> {
  let attempt = 0;

  while (mongoose.connection.readyState !== 1) {
    attempt++;

    try {
      await mongoose.connect(env.MONGODB_URI!, {
        serverSelectionTimeoutMS: 15000
      });

      return;
    } catch (error) {
      const delay = Math.min(
        1000 * 2 ** Math.min(attempt - 1, 5),
        30000
      );

      console.error('MongoDB connection failed; retrying.', {
        attempt,
        retryInMs: delay,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: safeMessage(error)
      });

      await sleep(delay);
    }
  }
}

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured.');
    return;
  }

  if (!retryTask) {
    watchConnection();
    retryTask = connectWithRetry();
  }
}
