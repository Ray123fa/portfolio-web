/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "showporto.rfaridh.my.id",
      },
    ],
  },
};

module.exports = nextConfig;
