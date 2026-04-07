/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        '*.cloudworkstations.dev',
        '*.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
        '*.firebase-studio.com',
        '*.hosted.app',
        'studio-9577324505-15044.web.app',
        'studio-9577324505-15044.firebaseapp.com',
        'localhost:9002'
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'flagcdn.com' }
    ],
  },
};

module.exports = nextConfig;