/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate, max-age=0, no-transform" },
          { key: "Expires", value: "0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
