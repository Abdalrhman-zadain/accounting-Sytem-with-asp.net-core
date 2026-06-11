import path from "node:path";
import type { NextConfig } from "next";

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

const apiProxyTarget = trimTrailingSlashes(
  process.env.NEXT_API_PROXY_TARGET?.trim() || "http://127.0.0.1:3007/api",
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["192.168.1.135"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
