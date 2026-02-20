import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Transpile monorepo packages
  transpilePackages: ['@omegaread/db'],
  // Set correct workspace root for monorepo
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
};

export default nextConfig;
