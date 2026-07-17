/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Cela désactive la vérification TypeScript pendant le build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Cela désactive la vérification ESLint pendant le build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig