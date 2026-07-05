import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow the Next.js image optimizer to resize/serve our public Firebase
    // Storage assets (originals are up to 2048px — far too heavy for mobile).
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
    qualities: [72],
  },
};

export default nextConfig;
