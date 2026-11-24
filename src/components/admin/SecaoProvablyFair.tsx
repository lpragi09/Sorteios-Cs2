"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { usePopup } from "@/components/Popup";
import Paginacao, { usePaginacao } from "@/components/Paginacao";
import { FAIR_KIND_LABEL, type FairKind } from "@/lib/fair";
import { formatarNumero } from "@/lib/sorteios";

type Giro = {
  id: string;
  kind: FairKind;
  target_id: string;
  title: string;
  total_weight: number;
  drand_round: number;
  winner_label: string | null;
  winner_ref: string | null;
  status: "waiting" | "drawn" | "confirmed" | "skipped";
  created_at: string;
};

const STATUS: Record<Giro["status"], { nome: string; cls: string }> = {
  waiting: { nome: "Esperando número", cls: "bg-grafite text-cinza" },
  drawn: { nome: "Sorteado, sem confirmar", cls: "bg-sangue text-osso" },
  confirmed: { nome: "Confirmado", cls: "bg-vermelho text-white" },
  skipped: { nome: "Descartado", cls: "bg-grafite text-cinza" },
};

// Todos os giros, com quem ganhou (o e-mail só aparece aqui, nunca na página pública)
export default function SecaoProvablyFair() {
  const popup = usePopup();
  const [giros, setGiros] = useState<Giro[] | null>(null);
  const [filtro, setFiltro] = useState<Giro["status"] | "todos">("todos");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      setGiros((await adminApi<{ giros: Giro[] }>("listarGiros")).giros);
    } catch (err) {
      popup.erro(err);
    }
  }, [popup]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (giros ?? []).filter(
      (g) => (filtro === "todos" || g.status === filtro) && (!q || [g.title, g.winner_label, g.winner_ref].some((x) => (x ?? "").toLowerCase().includes(q)))
    );
  }, [giros, filtro, busca]);
  const pag = usePaginacao(filtrados);

  return (
    <div>
      <p className="text-cinza max-w-[70ch] mb-5">
        Cada giro da roleta fica registrado com a lista congelada e o número público do drand. Giros descartados (&quot;Sortear de novo&quot;) também aparecem, pra ninguém dizer que o sorteio foi refeito escondido.{" "}
        <Link href="/provably-fair" target="_blank" className="text-osso font-bold border-b-2 border-vermelho">Página pública</Link>
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["todos", "confirmed", "drawn", "skipped"] as const).map((s) => (
          <button key={s} onClick={() => setFiltro(s)} className={`px-3.5 py-2 font-bold ${filtro === s ? "bg-vermelho text-white" : "bg-grafite text-cinza hover:text-osso"}`}>
            {s === "todos" ? "Todos" : STATUS[s].nome}
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Prêmio ou ganhador" className="campo !py-2 !pl-9" aria-label="Buscar giro" />
        </label>
        <button onClick={carregar} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" aria-label="Atualizar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {!giros ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-vermelho" /></div>
      ) : filtrados.length === 0 ? (
        <p className="text-cinza bg-carvao p-6">Nenhum giro aqui ainda.</p>
      ) : (
        <>
          <ul className="bg-carvao divide-y divide-grafite">
            {pag.itensPagina.map((g) => (
              <li key={g.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-lg truncate">{g.title}</p>
                  <p className="text-cinza text-sm">
                    {FAIR_KIND_LABEL[g.kind]}, {new Date(g.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}, {formatarNumero(g.total_weight)} chances, rodada drand {g.drand_round}
                  </p>
                </div>
                {g.winner_label && (
                  <div className="min-w-0 md:text-right">
                    <p className="font-bold truncate">{g.winner_label}</p>
                    {g.winner_ref && g.winner_ref !== g.winner_label && <p className="text-cinza text-sm truncate">{g.winner_ref}</p>}
                  </div>
                )}
                <span className={`shrink-0 self-start md:self-center px-2.5 py-1 text-sm font-bold ${STATUS[g.status].cls}`}>{STATUS[g.status].nome}</span>
                <Link href={`/provably-fair?id=${g.id}`} target="_blank" className="shrink-0 w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title="Abrir a prova" aria-label="Abrir a prova"><ExternalLink className="w-4 h-4" /></Link>
              </li>
            ))}
          </ul>
          <Paginacao {...pag} />
        </>
      )}
    </div>
  );
}
