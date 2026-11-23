import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Endereço antigo da lista de tickets (links já compartilhados continuam funcionando)
  async redirects() {
    return [{ source: "/meus-sorteios", destination: "/meus-tickets", permanent: true }];
  },
  images: {
    // Fotos do Google (login) e imagens dos prêmios no Supabase Storage
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
    ],
  },
};

export default nextConfig;
