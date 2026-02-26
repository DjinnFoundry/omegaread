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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'apps/web/src/lib/**/*.ts',
        'apps/web/src/server/**/*.ts',
        'apps/web/src/components/**/*.tsx',
        'packages/db/src/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/types/**',
        'apps/web/src/lib/audio/**',
        'apps/web/src/lib/ai/prompts.ts',
        'apps/web/src/server/actions/auth-actions.ts',
        'apps/web/src/server/actions/baseline-actions.ts',
        'apps/web/src/server/actions/flow-actions.ts',
        'apps/web/src/server/db.ts',
        'packages/db/src/index.ts',
      ],
      thresholds: {
        statements: 55,
        branches: 40,
        functions: 50,
        lines: 58,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'apps/web/src'),
      '@zetaread/db': resolve(__dirname, 'packages/db/src'),
      'react': resolve(__dirname, 'apps/web/node_modules/react'),
      'react-dom': resolve(__dirname, 'apps/web/node_modules/react-dom'),
      'next/headers': resolve(__dirname, '__mocks__/next/headers.ts'),
      'next/navigation': resolve(__dirname, '__mocks__/next/navigation.ts'),
    },
  },
});
