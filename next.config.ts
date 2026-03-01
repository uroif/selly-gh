import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable static optimization for dynamic pages
  experimental: {
    
  },
  // Skip prerendering for dynamic routes during build
  output: 'standalone',
};

export default nextConfig;
