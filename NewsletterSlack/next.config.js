/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure API routes can parse large payloads (emails can be big)
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  // Disable strict mode for now to avoid double effects
  reactStrictMode: false,
}

module.exports = nextConfig