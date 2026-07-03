/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Evita fallos de serialización de ESLint 9 Flat Config en Next.js 15
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
