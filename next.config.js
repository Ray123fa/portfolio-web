/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "showporto.rfaridh.my.id",
      },
    ],
  },
};

module.exports = nextConfig;
