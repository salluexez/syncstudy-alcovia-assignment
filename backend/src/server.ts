import { createApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './database/db.js';
import { n8nService } from './services/n8nService.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`SyncStudy API listening on port ${config.port}`);
  n8nService.startQueueWorker();
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}; shutting down SyncStudy API.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
