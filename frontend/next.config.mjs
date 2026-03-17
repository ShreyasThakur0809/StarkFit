/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // starknet is only used in API routes (server-side), not in client bundles
};

export default nextConfig;
