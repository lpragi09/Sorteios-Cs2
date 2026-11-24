"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Download, Loader2, Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { usePopup } from "@/components/Popup";
import Paginacao, { usePaginacao } from "@/components/Paginacao";
import { formatarNumero, formatarReais, nomeCasa } from "@/lib/sorteios";
import { baixarCsv } from "@/lib/csv";

type Vencedor = {
  id: number;
  sorteio_id: string;
  rodada: number;
  nome: string;
  email: string | null;
  casa: string | null;
  casa_id: string | null;
  coins: number | null;
  fair_draw_id: string | null;
  entregue: boolean;
  entregue_em: string | null;
  criado_em: string;
  sorteio_titulo: string;
  sorteio_valor: number | null;
  sorteio_tipo: string;
};

const FILTROS = [
  { id: "pendentes", nome: "Falta entregar" },
  { id: "entregues", nome: "Entregues" },
  { id: "todos", nome: "Todos" },
] as const;

const data = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function SecaoVencedores() {
  const popup = usePopup();
  const [lista, setLista] = useState<Vencedor[] | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("pendentes");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      setLista((await adminApi<{ vencedores: Vencedor[] }>("listarVencedores")).vencedores);
    } catch (err) {
      popup.erro(err);
    }
  }, [popup]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (lista ?? []).filter(
      (v) =>
        (filtro === "todos" || (filtro === "entregues" ? v.entregue : !v.entregue)) &&
        (!q || [v.nome, v.email, v.casa_id, v.sorteio_titulo].some((x) => (x ?? "").toLowerCase().includes(q)))
    );
  }, [lista, filtro, busca]);
  const pag = usePaginacao(filtrados);
  const faltam = lista?.filter((v) => !v.entregue).length ?? 0;
  const totalPremios = (lista ?? []).reduce((s, v) => s + (v.sorteio_valor ?? 0), 0);

  const alternarEntregue = async (v: Vencedor) => {
    setLista((l) => l?.map((x) => (x.id === v.id ? { ...x, entregue: !v.entregue, entregue_em: !v.entregue ? new Date().toISOString() : null } : x)) ?? null);
    try {
      await adminApi("marcarEntregue", { id: v.id, entregue: !v.entregue });
    } catch (err) {
      popup.erro(err);
      carregar();
    }
  };

  const [editando, setEditando] = useState<{ id: number; nome: string } | null>(null);
  const salvarNome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      await adminApi("editarVencedor", { id: editando.id, nome: editando.nome });
      setEditando(null);
      carregar();
    } catch (err) {
      popup.erro(err);
    }
  };

  const excluir = async (v: Vencedor) => {
    if (!(await popup.confirmar(`${v.nome} sai da lista de ganhadores de "${v.sorteio_titulo}". O giro continua registrado no provably fair.`, { titulo: "Tirar ganhador?", textoOk: "Tirar" }))) return;
    try {
      await adminApi("excluirGanhador", { id: v.id });
      setLista((l) => l?.filter((x) => x.id !== v.id) ?? null);
    } catch (err) {
      popup.erro(err);
    }
  };

  const exportar = () =>
    baixarCsv(
      "vencedores.csv",
      ["Data", "Sorteio", "Valor", "Rodada", "Ganhador", "E-mail", "Casa", "ID na casa", "Coins", "Entregue"],
      filtrados.map((v) => [data(v.criado_em), v.sorteio_titulo, v.sorteio_valor ?? "", v.rodada, v.nome, v.email ?? "", v.casa ? nomeCasa(v.casa) : "", v.casa_id ?? "", v.coins ?? "", v.entregue ? "sim" : "não"])
    );

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-0.5 mb-6">
        {[
          ["Vencedores", formatarNumero(lista?.length ?? 0)],
          ["Falta entregar", formatarNumero(faltam)],
          ["Em prêmios", formatarReais(totalPremios) || "R$ 0"],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-carvao p-5">
            <strong className="block font-display font-black text-[40px] leading-none">{valor}</strong>
            <span className="text-cinza">{rotulo}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className={`px-3.5 py-2 font-bold ${filtro === f.id ? "bg-vermelho text-white" : "bg-grafite text-cinza hover:text-osso"}`}>{f.nome}</button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, e-mail, ID ou prêmio" className="campo !py-2 !pl-9" aria-label="Buscar vencedor" />
        </label>
        <button onClick={exportar} disabled={!filtrados.length} className="h-10 px-3 bg-grafite hover:bg-grafite-2 font-bold flex items-center gap-1.5 disabled:opacity-40"><Download className="w-4 h-4" /> CSV</button>
      </div>

      {!lista ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-vermelho" /></div>
      ) : filtrados.length === 0 ? (
        <p className="text-cinza bg-carvao p-6">{filtro === "pendentes" ? "Nenhum prêmio esperando entrega." : "Nenhum vencedor aqui."}</p>
      ) : (
        <>
          <ul className="bg-carvao divide-y divide-grafite">
            {pag.itensPagina.map((v) => (
              <li key={v.id} className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 items-center p-4">
                <button onClick={() => alternarEntregue(v)} className={v.entregue ? "text-osso" : "text-cinza hover:text-osso"} title={v.entregue ? "Marcar como não entregue" : "Marcar como entregue"} aria-label={v.entregue ? "Marcar como não entregue" : "Marcar como entregue"}>
                  {v.entregue ? <CheckCircle2 className="w-7 h-7 text-vermelho" /> : <Circle className="w-7 h-7" />}
                </button>
                <div className="min-w-0">
                  {editando?.id === v.id ? (
                    <form onSubmit={salvarNome} className="flex gap-1 mb-1">
                      <input autoFocus value={editando.nome} onChange={(e) => setEditando({ id: v.id, nome: e.target.value })} className="campo !py-1.5" aria-label="Nome do ganhador" maxLength={60} />
                      <button type="submit" className="px-3 bg-vermelho font-bold">Salvar</button>
                      <button type="button" onClick={() => setEditando(null)} className="px-3 bg-grafite font-bold">Cancelar</button>
                    </form>
                  ) : (
                  <p className="font-bold text-lg truncate">
                    {v.nome} <span className="text-cinza font-semibold">levou {v.sorteio_titulo}{v.sorteio_valor != null ? ` (${formatarReais(v.sorteio_valor)})` : ""}</span>
                  </p>
                  )}
                  <p className="text-cinza text-sm truncate">
                    {data(v.criado_em)}{v.rodada > 1 ? `, rodada ${v.rodada}` : ""}
                    {v.email ? `, ${v.email}` : ", chat da Twitch"}
                    {v.casa ? `, ${nomeCasa(v.casa)} ID ${v.casa_id}` : ""}
                    {v.coins != null ? `, ${formatarNumero(v.coins)} coins` : ""}
                    {v.entregue && v.entregue_em ? `. Entregue em ${data(v.entregue_em)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 max-md:col-start-2">
                  {v.fair_draw_id && (
                    <Link href={`/provably-fair?id=${v.fair_draw_id}`} target="_blank" className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title="Prova do sorteio" aria-label="Prova do sorteio"><ShieldCheck className="w-4 h-4" /></Link>
                  )}
                  <button onClick={() => setEditando({ id: v.id, nome: v.nome })} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title="Editar nome" aria-label="Editar nome"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => excluir(v)} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title="Tirar ganhador" aria-label="Tirar ganhador"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          <Paginacao {...pag} />
        </>
      )}
    </div>
  );
}
