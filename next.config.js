/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: 'media.tutortime.co.id' },
      { protocol: 'https', hostname: 'customer-*.cloudflarestream.com' },
    ],
  },
};

module.exports = nextConfig;
