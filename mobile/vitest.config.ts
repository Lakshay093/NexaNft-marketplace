import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: [{ find: /^react-native$/, replacement: 'react-native-web' }] },
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'jsdom' },
});
