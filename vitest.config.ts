import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '.next', 'dist'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'apps/web/src'),
      '@omegaread/db': resolve(__dirname, 'packages/db/src'),
      'react': resolve(__dirname, 'apps/web/node_modules/react'),
      'react-dom': resolve(__dirname, 'apps/web/node_modules/react-dom'),
    },
  },
});
