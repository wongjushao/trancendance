import type { NextConfig } from "next";

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
    ]
  },
}

export default nextConfig