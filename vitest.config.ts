import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    teardownTimeout: 30000,
    poolOptions: {
      forks: {
        maxForks: 4
      }
    },
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**']
  }
});
