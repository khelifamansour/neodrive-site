import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/pdfkit/js/data/**"],
    "/api/video/local-create": ["./node_modules/@ffmpeg-installer/linux-x64/ffmpeg"],
  },
};

export default nextConfig;
