import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages (OpenNext) に必要な standalone 出力
  // output: 'export' は OpenNext と競合するため使用しない
  output: "standalone",
};

export default nextConfig;
