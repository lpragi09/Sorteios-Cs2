import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Barlow_Semi_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Rodape from "@/components/Rodape";
import CompletarCadastro from "@/components/CompletarCadastro";

const display = Big_Shoulders({ subsets: ["latin"], weight: ["700", "900"], variable: "--font-big-shoulders" });
const texto = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "Canal do Soares",
  description: "Skins de CS2 sorteadas na live do Soares. Deposite com o código SOARES e mande o print pra participar.",
  metadataBase: new URL("https://canalsoares.vercel.app"),
  openGraph: { images: ["/soares-hero.webp"] },
};

export const viewport: Viewport = { themeColor: "#0a0a0b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${texto.variable}`} data-scroll-behavior="smooth">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-[70vh]">{children}</main>
          <Rodape />
          <CompletarCadastro />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
