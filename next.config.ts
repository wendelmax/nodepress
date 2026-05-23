import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/admin/posts',
        destination: '/admin/edit?post_type=post',
      },
      {
        source: '/admin/pages',
        destination: '/admin/edit?post_type=page',
      },
    ];
  },
};

export default nextConfig;
