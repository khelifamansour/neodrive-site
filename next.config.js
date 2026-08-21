
/** @type {import('next').NextConfig} */

const nextConfig = {

  outputFileTracingIncludes: {
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
