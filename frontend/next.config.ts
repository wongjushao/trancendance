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
      {
        // This is what you call in fetch()
        source: '/api/auth-service/:path*',
        // This is where your Flask app is running
        destination: 'http://127.0.0.1:5001/api/auth-service/:path*',
      },
    ]
  },
}

export default nextConfig