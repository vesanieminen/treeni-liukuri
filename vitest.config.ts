import { defineConfig } from 'vitest/config';

// Separate from Vaadin's generated vite.config.ts so unit tests run without the Vaadin dev tooling.
export default defineConfig({
  test: {
    include: ['src/test/frontend/**/*.test.ts'],
    environment: 'node',
  },
});
