import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Program/university logos are stored as arbitrary external URLs in the API,
  // so we allow any https host and let the browser render them directly.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
