import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', '@sparticuz/chromium']
};

export default nextConfig;
