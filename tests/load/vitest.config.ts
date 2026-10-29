import { defineConfig } from 'vitest/config';

/** Load scenarios (npm run load:api): in-process, mocked providers only. Not part of `npm test`. */
export default defineConfig({
  test: {
    include: ['tests/load/**/*.load.ts'],
    environment: 'node',
    testTimeout: 180_000,
  },
});
