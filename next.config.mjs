/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Compiler for automatic memoization
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
