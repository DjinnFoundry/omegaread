import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile monorepo packages
  transpilePackages: ['@omegaread/db'],
  // Experimental features
  experimental: {
    // Server actions enabled by default in Next 15
  },
};

export default nextConfig;
