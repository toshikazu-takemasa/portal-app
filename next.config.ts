import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 静的出力: GitHub Pages / Cloudflare Pages にデプロイ可能
  // API Routes を追加したら output: 'export' を削除して Vercel/Cloudflare Workers に移行
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
