import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    port: 1236,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
