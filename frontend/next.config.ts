// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://auth-service:5001/:path*',
      },
      {
        source: '/api/chat/:path*',
        destination: 'http://chat-service:5002/:path*',
      },
      {
        source: '/api/org/:path*',
        destination: 'http://org-service:5003/:path*',
      },
      {
        source: '/api/auth-service/:path*',
        destination: 'http://auth-service:5001/api/auth-service/:path*',
      },
      {
        source: '/api/notification-service/:path*',
        destination: 'http://notification-service:5004/:path*',
      },
      {
        source: '/api/chat-service/:path*',
        destination: 'http://chat-service:5002/api/chat-service/:path*',
      },
    ];
  },
  // Add WebSocket proxy configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  // Allow WebSocket connections
  experimental: {
    // Add any experimental features if needed
  },
};

export default nextConfig;