"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { usePopup } from "@/components/Popup";
import Paginacao, { usePaginacao } from "@/components/Paginacao";
import { formatarNumero, nomeCasa, type StatusTicket } from "@/lib/sorteios";

type Ticket = {
  id: number;
  email: string;
  nome: string | null;
  avatar_url: string | null;
  casa: string;
  casa_id: string;
  coins: number;
  instagram: string;
  print_url: string | null;
  status: StatusTicket;
  criado_em: string;
};

const FILTROS: { id: StatusTicket | "todos"; nome: string }[] = [
  { id: "pendente", nome: "Pendentes" },
  { id: "aprovado", nome: "Aprovados" },
  { id: "recusado", nome: "Recusados" },
  { id: "todos", nome: "Todos" },
];

export default function TicketsSorteio({ sorteioId, onMudou }: { sorteioId: string; onMudou: () => void }) {
  const popup = usePopup();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filtro, setFiltro] = useState<StatusTicket | "todos">("pendente");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Ticket | null>(null);
  const [print, setPrint] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const { tickets } = await adminApi<{ tickets: Ticket[] }>("listarTickets", { sorteioId });
      setTickets(tickets);
    } catch (err) {
      popup.erro(err);
    }
  }, [sorteioId, popup]);

  // Busca de dados: o state só muda depois da resposta (o componente é recriado a cada sorteio)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (tickets ?? []).filter(
      (t) =>
        (filtro === "todos" || t.status === filtro) &&
        (!q || t.instagram.includes(q) || t.casa_id.toLowerCase().includes(q) || t.email.includes(q) || (t.nome ?? "").toLowerCase().includes(q))
    );
  }, [tickets, filtro, busca]);
  const pag = usePaginacao(filtrados);
  const contagem = (s: StatusTicket) => tickets?.filter((t) => t.status === s).length ?? 0;

  const mudarStatus = async (t: Ticket, status: StatusTicket) => {
    setTickets((lista) => lista?.map((x) => (x.id === t.id ? { ...x, status } : x)) ?? null);
    try {
      await adminApi("statusTicket", { id: t.id, status });
      onMudou();
    } catch (err) {
      popup.erro(err);
      carregar();
    }
  };

  const excluir = async (t: Ticket) => {
    if (!(await popup.confirmar(`O ticket de ${t.instagram} (${formatarNumero(t.coins)} coins) e o print serão apagados.`, { titulo: "Excluir ticket?", textoOk: "Excluir" }))) return;
    try {
      await adminApi("excluirTicket", { id: t.id });
      setTickets((lista) => lista?.filter((x) => x.id !== t.id) ?? null);
      onMudou();
    } catch (err) {
      popup.erro(err);
    }
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      await adminApi("editarTicket", { id: editando.id, coins: editando.coins, instagram: editando.instagram, casa_id: editando.casa_id });
      setEditando(null);
      carregar();
      onMudou();
    } catch (err) {
      popup.erro(err);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className={`px-3.5 py-2 font-bold ${filtro === f.id ? "bg-vermelho text-white" : "bg-grafite text-cinza hover:text-osso"}`}>
            {f.nome}{f.id !== "todos" && tickets ? ` (${contagem(f.id)})` : ""}
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Instagram, ID ou e-mail" className="campo !py-2 !pl-9" aria-label="Buscar ticket" />
        </label>
        <button onClick={carregar} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" aria-label="Atualizar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {!tickets ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-vermelho" /></div>
      ) : filtrados.length === 0 ? (
        <p className="text-cinza bg-preto p-6">{filtro === "pendente" ? "Nenhum ticket esperando aprovação." : "Nenhum ticket aqui."}</p>
      ) : (
        <>
          <ul className="divide-y divide-grafite border-y border-grafite">
            {pag.itensPagina.map((t) => (
              <li key={t.id} className="grid grid-cols-[72px_1fr] md:grid-cols-[72px_1fr_auto] gap-3 py-3 items-center">
                <button onClick={() => t.print_url && setPrint(t.print_url)} className="w-[72px] h-[72px] bg-preto overflow-hidden" aria-label="Ver print">
                  {t.print_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.print_url} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform" loading="lazy" />
                  ) : (
                    <span className="text-cinza text-xs">sem print</span>
                  )}
                </button>
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate">{t.instagram} <span className="text-vermelho">{formatarNumero(t.coins)} coins</span></p>
                  <p className="text-cinza text-[15px] truncate">{nomeCasa(t.casa)}, ID {t.casa_id}</p>
                  <p className="text-cinza text-sm truncate">{t.email}, {new Date(t.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
                <div className="flex gap-1 max-md:col-start-2">
                  {t.status !== "aprovado" && (
                    <button onClick={() => mudarStatus(t, "aprovado")} className="h-10 px-3 bg-vermelho hover:bg-vermelho-claro font-bold flex items-center gap-1.5"><Check className="w-4 h-4" /> Aprovar</button>
                  )}
                  {t.status !== "recusado" && (
                    <button onClick={() => mudarStatus(t, "recusado")} className="h-10 px-3 bg-grafite hover:bg-grafite-2 font-bold flex items-center gap-1.5"><X className="w-4 h-4" /> Recusar</button>
                  )}
                  <button onClick={() => setEditando(t)} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => excluir(t)} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" aria-label="Excluir"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          <Paginacao {...pag} />
        </>
      )}

      {print && (
        <div className="fixed inset-0 z-[250] bg-black/90 grid place-items-center p-4" onClick={() => setPrint(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={print} alt="Print do depósito" className="max-w-full max-h-[90vh] object-contain" />
          <a href={print} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute bottom-5 btn btn-cinza">Abrir em tamanho real</a>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-[250] bg-black/85 grid place-items-center p-4" onClick={() => setEditando(null)}>
          <form onSubmit={salvarEdicao} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-carvao corte p-6 flex flex-col gap-3 animate-surge">
            <h3 className="font-display font-black uppercase text-3xl leading-none">Editar ticket</h3>
            <label><span className="font-semibold block mb-1">Instagram</span><input value={editando.instagram} onChange={(e) => setEditando({ ...editando, instagram: e.target.value })} className="campo" /></label>
            <label><span className="font-semibold block mb-1">ID na {nomeCasa(editando.casa)}</span><input value={editando.casa_id} onChange={(e) => setEditando({ ...editando, casa_id: e.target.value })} className="campo" /></label>
            <label><span className="font-semibold block mb-1">Coins</span><input type="number" min={1} value={editando.coins} onChange={(e) => setEditando({ ...editando, coins: Number(e.target.value) })} className="campo" /></label>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setEditando(null)} className="btn btn-cinza !py-2.5">Cancelar</button>
              <button type="submit" className="btn btn-vermelho !py-2.5">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
