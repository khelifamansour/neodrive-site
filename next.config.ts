import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Doublon de /fiat-topolino-ou-neodrive : on concentre le référencement sur la page comparatif.
      { source: "/blog/neodrive-ou-fiat-topolino", destination: "/fiat-topolino-ou-neodrive", permanent: true },
    ];
  },
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
    "/api/studio/video": ["./node_modules/@ffmpeg-installer/linux-x64/ffmpeg", "./lib/studio-fonts/**", "./public/neodrive-background.mp3"],
  },
};

export default nextConfig;
