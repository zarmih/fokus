import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', include: ['scripts/inventory/*.inv.ts'], testTimeout: 600000 }
});
