import type { NextConfig } from 'next';
import path from 'path';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Transpile monorepo packages
  transpilePackages: ['@zetaread/db'],
  // Set correct workspace root for monorepo
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  // Audio base64 puede superar 1MB en Server Actions durante analisis de lectura.
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
