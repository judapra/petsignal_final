
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Desabilitar erros de build do TypeScript no deploy
    ignoreBuildErrors: true,
  },
  eslint: {
    // Desabilitar erros do ESLint no deploy
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
       {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
};

module.exports = nextConfig;
