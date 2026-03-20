import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "https://auth-service:5001/api/auth-service/:path*",
      },
      {
        source: "/api/chat/:path*",
        destination: "https://chat-service:5002/api/chat-service/:path*",
      },
      {
        source: "/api/org/:path*",
        destination: "https://org-service:5003/api/org-service/:path*",
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            net: false,
            tls: false,
            dns: false,
            crypto: false,
        };
    }
    return config;
  },
};

export default nextConfig;