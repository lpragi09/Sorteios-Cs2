import Link from "next/link";
import { Marca } from "@/components/Navbar";

const REDES = [
  { href: "https://www.twitch.tv/soares", label: "Twitch", sigla: "TW" },
  { href: "https://www.instagram.com/soarexcs/", label: "Instagram", sigla: "IG" },
];

export default function Rodape() {
  return (
    <footer className="border-t border-grafite mt-10">
      <div className="mx-auto w-[min(1180px,100%-40px)] py-10 flex flex-wrap items-center justify-between gap-6">
        <Link href="/" aria-label="Início"><Marca /></Link>
        <div className="text-cinza text-[15px] max-w-[60ch] space-y-1">
          <p>Proibido para menores de 18 anos. Os parceiros são sites de terceiros; jogue com responsabilidade.</p>
          <p>
            Cada sorteio pode ser conferido em <Link href="/provably-fair" className="text-osso underline decoration-vermelho underline-offset-4">provably fair</Link>.
          </p>
        </div>
        <div className="flex gap-0.5">
          {REDES.map((r) => (
            <a key={r.href} href={r.href} target="_blank" rel="noreferrer" aria-label={r.label} className="w-12 h-12 grid place-items-center bg-carvao hover:bg-vermelho font-bold text-sm transition-colors">
              {r.sigla}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
