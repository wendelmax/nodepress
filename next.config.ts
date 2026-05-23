import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  devIndicators: {
    appIsrStatus: false,
  },
};

export default nextConfig;
