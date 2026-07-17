import type { NextConfig } from "next";

const FLASK_ORIGIN = process.env.FLASK_ORIGIN || "http://127.0.0.1:5000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "5000" },
      { protocol: "http", hostname: "localhost", port: "5000" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${FLASK_ORIGIN}/api/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${FLASK_ORIGIN}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
