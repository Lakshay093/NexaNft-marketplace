import { createApp } from './app';
import { env } from './config/env';
import { db } from './models/db';
import { logger } from './utils/logger';
const server = createApp().listen(env.PORT, '0.0.0.0', () =>
  logger.info({ port: env.PORT }, 'NexaNFT API listening'),
);
async function shutdown() {
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
