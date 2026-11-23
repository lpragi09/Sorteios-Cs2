"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, Menu, Shield, Ticket, X } from "lucide-react";

export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 font-display font-black text-[28px] leading-none ${className}`}>
      <b className="bg-vermelho text-white px-2 pt-0.5 [clip-path:polygon(0_0,100%_0,100%_70%,85%_100%,0_100%)]">CS2</b>
      SOARES
    </span>
  );
}

const LINKS = [
  { href: "/#sorteios", label: "Sorteios" },
  { href: "/chat", label: "Sorteio do chat" },
  { href: "/#ganhadores", label: "Ganhadores" },
  { href: "/mix", label: "Mix 5v5" },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [rotaDoMenu, setRotaDoMenu] = useState(pathname);
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  // Fecha o menu do celular ao trocar de página
  if (rotaDoMenu !== pathname) {
    setRotaDoMenu(pathname);
    setAberto(false);
  }

  const ativo = (href: string) => (href.startsWith("/#") ? false : pathname === href);

  return (
    <header className="sticky top-0 z-40 bg-preto/90 backdrop-blur-md border-b border-grafite">
      <div className="mx-auto w-[min(1180px,100%-40px)] h-[72px] flex items-center justify-between gap-5">
        <Link href="/" aria-label="Início">
          <Marca />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={ativo(l.href) ? "page" : undefined}
                  className="block px-3.5 py-2 font-semibold text-cinza hover:text-osso border-b-2 border-transparent aria-[current=page]:text-osso aria-[current=page]:border-vermelho"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href="https://www.twitch.tv/soares"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-2 font-bold text-[15px] px-3 py-2 border border-grafite hover:border-grafite-2"
          >
            <i className="w-2 h-2 rounded-full bg-vermelho animate-pisca" aria-hidden />
            Twitch
          </a>

          {status === "authenticated" ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="hidden sm:flex btn btn-cinza !py-2.5 !px-4 !text-base" aria-label="Painel admin">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}
              <Link href="/meus-tickets" className="hidden sm:flex btn btn-cinza !py-2.5 !px-4 !text-base">
                <Ticket className="w-4 h-4" /> Meus tickets
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="hidden sm:grid place-items-center w-11 h-11 bg-carvao hover:bg-grafite" aria-label="Sair">
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </button>
            </>
          ) : (
            <button onClick={() => signIn("google")} disabled={status === "loading"} className="hidden sm:flex btn btn-cinza !py-2.5 !px-4 !text-base">
              Entrar com Google
            </button>
          )}

          <button onClick={() => setAberto((v) => !v)} className="lg:hidden grid place-items-center w-11 h-11 bg-carvao" aria-label="Menu" aria-expanded={aberto}>
            {aberto ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {aberto && (
        <div className="lg:hidden border-t border-grafite bg-preto animate-surge">
          <ul className="mx-auto w-[min(1180px,100%-40px)] py-3 flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setAberto(false)} className="block py-3 font-semibold text-lg border-b border-grafite">
                  {l.label}
                </Link>
              </li>
            ))}
            {status === "authenticated" ? (
              <>
                <li><Link href="/meus-tickets" className="block py-3 font-semibold text-lg border-b border-grafite">Meus tickets</Link></li>
                {isAdmin && <li><Link href="/admin" className="block py-3 font-semibold text-lg border-b border-grafite">Painel admin</Link></li>}
                <li><button onClick={() => signOut({ callbackUrl: "/" })} className="py-3 font-semibold text-lg text-cinza">Sair ({session.user?.email})</button></li>
              </>
            ) : (
              <li className="pt-3"><button onClick={() => signIn("google")} className="btn btn-vermelho w-full">Entrar com Google</button></li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
