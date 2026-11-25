/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
    agentUpgrade: 'security',
  },
};

export default nextConfig;
