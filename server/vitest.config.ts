import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
const database = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '');
if (!process.env.TEST_DATABASE_URL) database.pathname = '/nexanft_test';
if (!database.pathname.endsWith('_test'))
  throw new Error('Tests require an isolated database ending in _test');
process.env.DATABASE_URL = database.toString();
process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_TRANSFERS = 'true';
process.env.SMTP_HOST = '';
process.env.STORAGE_DRIVER = 'local';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
