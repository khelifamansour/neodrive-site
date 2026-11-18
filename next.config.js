
/** @type {import('next').NextConfig} */

const nextConfig = {
  async redirects() {
    return [
      // Doublon de /fiat-topolino-ou-neodrive : on concentre le référencement sur la page comparatif.
      { source: "/blog/neodrive-ou-fiat-topolino", destination: "/fiat-topolino-ou-neodrive", permanent: true },
    ];
  },

  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/pdfkit/js/data/**"],
    "/api/tiktok/publish-reel": ["./node_modules/@ffmpeg-installer/linux-x64/ffmpeg"],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

};

module.exports = nextConfig;
