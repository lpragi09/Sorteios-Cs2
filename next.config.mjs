/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ATENÇÃO: Isso permite o build mesmo com erros de tipo
    ignoreBuildErrors: true,
  },
  eslint: {
    // Isso ignora avisos de variáveis não usadas durante o build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;