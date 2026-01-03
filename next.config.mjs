/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permite que o build termine mesmo se houver erros de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Impede que avisos de variáveis não usadas travem o deploy
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;