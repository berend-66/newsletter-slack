/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure API routes can parse large payloads (emails can be big)
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  // Disable strict mode for now to avoid double effects
  reactStrictMode: false,
}

module.exports = nextConfig