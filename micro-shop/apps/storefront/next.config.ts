import type { NextConfig } from 'next';

// The storefront is NOT a Module Federation host or remote. It is a separate
// "zone": the gateway (infra/gateway) sends public URLs here and signed-in app
// URLs to the shell. The two share @micro-shop/ui at BUILD time, nothing at runtime.

const nextConfig: NextConfig = {
  // @micro-shop/ui ships TypeScript source; Next compiles it like app code.
  transpilePackages: ['@micro-shop/ui'],

  // In dev, the gateway (localhost:8080) proxies requests to this server.
  allowedDevOrigins: ['localhost', '127.0.0.1'],
};

export default nextConfig;
