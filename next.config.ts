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
  serverExternalPackages: ["genkit", "@genkit-ai/core", "genkitx-openai", "opik"],
};

export default nextConfig;
