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
        destination: 'http://auth-service:5001/api/auth-service/:path*',
      },
    ]
  },
  // Increase body parser limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig