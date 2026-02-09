import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
  // Exclude packages from webpack bundling to avoid conflicts with Next.js
  serverExternalPackages: ["openai", "opik", "opik-openai"],
};

export default nextConfig;
