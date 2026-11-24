"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signOut, useSession } from "next-auth/react";
import { Ban, Loader2, LogOut, MessageCircle, UserRound } from "lucide-react";
import { formatarWhatsapp, limparNome, limparWhatsapp } from "@/lib/perfil";

const ADIADO = "soares_cadastro_depois"; // "Agora não" vale só até fechar o navegador

/** Depois do login com o Google, pede nome e WhatsApp uma vez (fica em Painel > Usuários do site). */
export default function CompletarCadastro() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;
  const [aberto, setAberto] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [nome, setNome] = useState("");
  const [whats, setWhats] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !email) return;
    let ativo = true;
    fetch("/api/perfil", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!ativo || !p) return;
        if (p.bloqueado) return setBloqueado(true);
        if (p.completo || sessionStorage.getItem(ADIADO) === email) return;
        setNome(p.nome ?? "");
        setWhats(formatarWhatsapp(p.whatsapp));
        setAberto(true);
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, [status, email]);

  // Conta bloqueada: cobre o site inteiro e só deixa sair
  if (bloqueado) {
    return createPortal(
      <div className="fixed inset-0 z-[2000] bg-preto flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-labelledby="bloqueio-titulo">
        <div className="w-full max-w-md bg-carvao corte border-t-4 border-vermelho p-8 text-center">
          <Ban className="w-14 h-14 text-vermelho mx-auto mb-4" />
          <h2 id="bloqueio-titulo" className="font-display font-black uppercase text-[40px] leading-none">Sua conta foi bloqueada</h2>
          <p className="text-cinza mt-3">
            A conta {email} não pode mais participar dos sorteios do Soares. Se acha que é um engano, fale com a equipe pelo Instagram ou na live.
          </p>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="btn btn-cinza mt-7 mx-auto">
            <LogOut className="w-4 h-4" /> Sair da conta
          </button>
        </div>
      </div>,
      document.body
    );
  }

  if (!aberto) return null;

  const depois = () => {
    if (email) sessionStorage.setItem(ADIADO, email);
    setAberto(false);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limparNome(nome).length < 2) return setErro("Digite o seu nome.");
    if (!limparWhatsapp(whats)) return setErro("Digite um WhatsApp com DDD, como (11) 98765-4321.");
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, whatsapp: whats }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Não foi possível salvar. Tente de novo.");
      setAberto(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar. Tente de novo.");
    }
    setSalvando(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[900] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={salvar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cadastro-titulo"
        className="w-full max-w-md bg-carvao corte border-t-4 border-vermelho p-7 animate-surge"
      >
        <div className="flex items-center gap-3 mb-1">
          {session?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-full" />
          )}
          <h2 id="cadastro-titulo" className="font-display font-black uppercase text-[34px] leading-none">Complete seu cadastro</h2>
        </div>
        <p className="text-cinza mb-6">Se você ganhar, é por esse WhatsApp que a equipe do Soares vai falar com você.</p>

        <label className="block mb-4">
          <span className="font-bold text-[15px]">Seu nome</span>
          <span className="relative block mt-1.5">
            <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={60}
              autoComplete="name"
              required
              autoFocus
              className="campo !pl-9"
              placeholder="Como você se chama"
            />
          </span>
        </label>

        <label className="block">
          <span className="font-bold text-[15px]">WhatsApp</span>
          <span className="relative block mt-1.5">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
            <input
              value={whats}
              onChange={(e) => setWhats(formatarWhatsapp(e.target.value))}
              inputMode="tel"
              autoComplete="tel-national"
              required
              className="campo !pl-9 tabular-nums"
              placeholder="(11) 98765-4321"
            />
          </span>
        </label>

        {erro && <p role="alert" className="text-vermelho-claro font-semibold mt-4">{erro}</p>}

        <div className="flex gap-2 mt-7">
          <button type="button" onClick={depois} className="btn btn-cinza !px-4 !text-base">Agora não</button>
          <button type="submit" disabled={salvando} className="btn btn-vermelho flex-1 !text-base">
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar cadastro"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
