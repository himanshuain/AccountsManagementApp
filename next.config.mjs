/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Compiler for automatic memoization
  experimental: {
    reactCompiler: true,
  },
  // Configure remote images for Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
