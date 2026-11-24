"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Gift, Loader2, Trophy } from "lucide-react";
import { formatarNumero, formatarReais, nomeCasa, type StatusTicket } from "@/lib/sorteios";
import { useRefreshOnReturn } from "@/lib/freshData";
import Paginacao, { usePaginacao } from "@/components/Paginacao";

type Ticket = {
  id: number;
  sorteio_id: string;
  casa: string;
  casa_id: string;
  coins: number;
  instagram: string;
  status: StatusTicket;
  criado_em: string;
  ganhou: boolean;
  sorteio: { titulo: string; valor: number | null; status: string; imagem_url: string | null } | null;
};


const STATUS: Record<StatusTicket, { texto: string; cls: string }> = {
  pendente: { texto: "Esperando aprovação", cls: "bg-grafite text-osso" },
  aprovado: { texto: "Aprovado", cls: "bg-vermelho text-white" },
  recusado: { texto: "Recusado", cls: "bg-preto text-cinza border border-grafite" },
};

export default function MeusTickets() {
  const { status } = useSession();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/meus-tickets", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTickets(json.tickets);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível carregar seus tickets.");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { if (status === "authenticated") carregar(); }, [status, carregar]);
  useRefreshOnReturn(() => { if (status === "authenticated") carregar(); });

  const total = tickets?.length ?? 0;
  const pag = usePaginacao(tickets ?? []);
  const aprovados = tickets?.filter((t) => t.status === "aprovado") ?? [];

  return (
    <div className="mx-auto w-[min(1000px,100%-40px)] py-16">
      <h1 className="font-display font-black uppercase leading-[.9] text-[clamp(48px,7vw,88px)]">Meus tickets</h1>

      {status === "loading" ? (
        <Loader2 className="w-8 h-8 animate-spin text-vermelho mt-10" />
      ) : status !== "authenticated" ? (
        <div className="bg-carvao p-8 mt-8 border-l-4 border-vermelho">
          <p className="font-bold text-lg">Entre com o Google pra ver os tickets que você mandou.</p>
          <button onClick={() => signIn("google")} className="btn btn-vermelho mt-5">Entrar com Google</button>
        </div>
      ) : erro ? (
        <div className="bg-carvao p-8 mt-8 border-l-4 border-vermelho">
          <p className="font-bold">{erro}</p>
          <button onClick={carregar} className="btn btn-cinza mt-4">Tentar de novo</button>
        </div>
      ) : !tickets ? (
        <Loader2 className="w-8 h-8 animate-spin text-vermelho mt-10" />
      ) : tickets.length === 0 ? (
        <div className="bg-carvao p-8 mt-8 border-l-4 border-vermelho">
          <p className="font-bold text-lg">Você ainda não mandou nenhum ticket.</p>
          <p className="text-cinza mt-1">Escolha um sorteio aberto, deposite com o código SOARES e mande o print.</p>
          <Link href="/#sorteios" className="btn btn-vermelho mt-5">Ver sorteios abertos</Link>
        </div>
      ) : (
        <>
          <div className="flex gap-10 mt-6 mb-10 text-cinza">
            <div><strong className="block text-osso font-display font-black text-[42px] leading-none">{formatarNumero(total)}</strong>tickets enviados</div>
            <div><strong className="block text-osso font-display font-black text-[42px] leading-none">{formatarNumero(aprovados.reduce((s, t) => s + t.coins, 0))}</strong>coins aprovadas</div>
          </div>

          <ul className="border-t border-grafite">
            {pag.itensPagina.map((t) => (
              <li key={t.id} className="grid grid-cols-[64px_1fr] sm:grid-cols-[64px_1fr_auto] gap-x-4 gap-y-2 items-center py-4 border-b border-grafite">
                <div className="w-16 h-16 fundo-premio grid place-items-center overflow-hidden">
                  {t.sorteio?.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.sorteio.imagem_url} alt="" className="w-[90%] h-[90%] object-contain" />
                  ) : (
                    <Gift className="text-grafite-2" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate flex items-center gap-2">
                    {t.ganhou && <Trophy className="w-5 h-5 text-vermelho shrink-0" aria-label="Você ganhou este sorteio" />}
                    {t.sorteio?.titulo ?? "Sorteio excluído"}
                    {t.sorteio?.valor != null && <span className="text-cinza font-semibold">{formatarReais(t.sorteio.valor)}</span>}
                  </p>
                  <p className="text-cinza text-[15px]">
                    {formatarNumero(t.coins)} coins na {nomeCasa(t.casa)} (ID {t.casa_id}), {new Date(t.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <span className={`max-sm:col-start-2 justify-self-start px-2.5 py-1 text-sm font-bold ${STATUS[t.status].cls}`}>{STATUS[t.status].texto}</span>
              </li>
            ))}
          </ul>

          <Paginacao {...pag} />
        </>
      )}
    </div>
  );
}
