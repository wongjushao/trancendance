import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'https://auth-service:5001/:path*',
      },
      {
        source: '/api/chat/:path*',
        destination: 'https://chat-service:5002/:path*',
      },
      {
        source: '/api/chat-service/:path*',
        destination: 'https://chat-service:5002/:path*',
      },
      {
        source: '/api/org/:path*',
        destination: 'https://org-service:5003/:path*',
      },
      {
        source: '/api/auth-service/:path*',
        destination: 'https://auth-service:5001/api/auth-service/:path*',
      },
      {
        source: '/api/notification-service/:path*',
        destination: 'https://notification-service:5004/:path*',
      },
      {
        source: '/api/org-service/:path*',
        destination: 'https://org-service:5003/:path*',
      },
    ]
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;