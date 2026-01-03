import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar"; // Importando o menu novo

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CS2 Sorteios",
  description: "Ganhe skins de CS2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className={`${inter.className} bg-slate-950 text-white`}>
        <Providers>
            {/* O Navbar fica aqui, fixo para todas as páginas */}
            <Navbar /> 
            {children}
        </Providers>
      </body>
    </html>
  );
}