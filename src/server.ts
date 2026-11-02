import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.info(`Backend listening on port ${env.PORT}.`);
});

void connectDatabase();

function shutdown(signal: string): void {
  console.info(`${signal} received; shutting down backend.`);
  server.close(error => {
    if (error) {
      console.error('HTTP server shutdown failed.', error);
      process.exitCode = 1;
    }
    process.exit();
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
