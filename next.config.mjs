/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  experimental: {
    // React Compiler rewrites components on every compile. On large client pages it
    // often breaks Fast Refresh mid-session (white screen / missing chunk errors).
    // Production builds still get the compiler; dev uses plain React for stable HMR.
    reactCompiler: !isDev,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
