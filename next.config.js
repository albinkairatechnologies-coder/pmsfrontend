/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dynamically export as static HTML only when compiling for mobile app
  ...(process.env.BUILD_MOBILE === 'true' ? { output: 'export', images: { unoptimized: true } } : {}),
}

module.exports = nextConfig

