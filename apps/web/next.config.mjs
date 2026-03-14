/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lastgate/engine"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
