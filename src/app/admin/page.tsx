"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Dices, ExternalLink, Gift, Loader2, Lock, MessageSquare, Pencil, Plus, ShieldCheck, Ticket, Trash2, Trophy, Unlock } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { formatarNumero, formatarReais, nomeCasa, type Sorteio } from "@/lib/sorteios";
import { usePopup } from "@/components/Popup";
import FormSorteio from "@/components/admin/FormSorteio";
import TicketsSorteio from "@/components/admin/TicketsSorteio";
import ChatAoVivo from "@/components/admin/ChatAoVivo";
import Roleta from "@/components/admin/Roleta";

type SorteioAdmin = Sorteio & { tickets: number; coins: number; pendentes: number; chat: number };
type GanhadorAdmin = { id: number; rodada: number; nome: string; email: string | null; casa: string | null; casa_id: string | null; coins: number | null; fair_draw_id: string | null; criado_em: string };

export default function Admin() {
  const { data: session, status } = useSession();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  const popup = usePopup();
  const [sorteios, setSorteios] = useState<SorteioAdmin[] | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [form, setForm] = useState<{ sorteio: Sorteio | null } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const { sorteios } = await adminApi<{ sorteios: SorteioAdmin[] }>("listarSorteios");
      setSorteios(sorteios);
      setSelecionadoId((atual) => (atual && sorteios.some((s) => s.id === atual) ? atual : sorteios[0]?.id ?? null));
    } catch (err) {
      popup.erro(err);
    }
  }, [popup]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { if (isAdmin) carregar(); }, [isAdmin, carregar]);

  if (status === "loading") return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>;
  if (!isAdmin) {
    return (
      <div className="mx-auto w-[min(700px,100%-40px)] py-20">
        <Lock className="w-10 h-10 text-vermelho mb-4" />
        <h1 className="font-display font-black uppercase text-6xl leading-none">Painel admin</h1>
        <p className="text-cinza mt-3">{status === "authenticated" ? `A conta ${session?.user?.email} não tem acesso ao painel.` : "Entre com a conta Google da equipe."}</p>
        {status !== "authenticated" && <button onClick={() => signIn("google")} className="btn btn-vermelho mt-6">Entrar com Google</button>}
      </div>
    );
  }

  const selecionado = sorteios?.find((s) => s.id === selecionadoId) ?? null;

  return (
    <div className="mx-auto w-[min(1280px,100%-32px)] py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h1 className="font-display font-black uppercase text-[clamp(44px,6vw,72px)] leading-none">Painel</h1>
        <button onClick={() => setForm({ sorteio: null })} className="btn btn-vermelho"><Plus className="w-5 h-5" /> Novo sorteio</button>
      </div>

      {!sorteios ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>
      ) : sorteios.length === 0 ? (
        <div className="bg-carvao p-8 border-l-4 border-vermelho">
          <p className="font-bold text-lg">Nenhum sorteio criado ainda.</p>
          <p className="text-cinza mt-1">Crie um sorteio por print de depósito ou pelo chat da Twitch.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
          <ul className="flex flex-col gap-0.5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
            {sorteios.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelecionadoId(s.id)}
                  className={`w-full text-left flex items-center gap-3 p-3 border-l-4 ${s.id === selecionadoId ? "bg-carvao-2 border-vermelho" : "bg-carvao border-transparent hover:bg-carvao-2"}`}
                >
                  <span className="w-12 h-12 shrink-0 fundo-premio grid place-items-center overflow-hidden">
                    {s.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imagem_url} alt="" className="w-[90%] h-[90%] object-contain" />
                    ) : s.tipo === "chat" ? <MessageSquare className="w-5 h-5 text-cinza" /> : <Gift className="w-5 h-5 text-cinza" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{s.titulo}</b>
                    <span className="text-cinza text-sm">
                      {s.status === "encerrado" ? "Encerrado" : s.tipo === "chat" ? (s.captando ? "Chat aberto" : "Chat fechado") : "Aberto"}
                      {s.tipo === "chat" ? `, ${formatarNumero(s.chat)} no chat` : `, ${formatarNumero(s.tickets)} tickets`}
                    </span>
                  </span>
                  {s.pendentes > 0 && <span className="shrink-0 bg-vermelho text-white text-sm font-bold px-2 py-0.5" title="Tickets esperando aprovação">{s.pendentes}</span>}
                </button>
              </li>
            ))}
          </ul>

          {selecionado && <Detalhe key={selecionado.id} sorteio={selecionado} onEditar={() => setForm({ sorteio: selecionado })} onMudou={carregar} />}
        </div>
      )}

      {form && (
        <FormSorteio
          sorteio={form.sorteio}
          onFechar={() => setForm(null)}
          onSalvo={(s) => {
            setForm(null);
            setSelecionadoId(s.id);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function Detalhe({ sorteio, onEditar, onMudou }: { sorteio: SorteioAdmin; onEditar: () => void; onMudou: () => void }) {
  const popup = usePopup();
  const chat = sorteio.tipo === "chat";
  const [aba, setAba] = useState<"principal" | "ganhadores">("principal");
  const [sorteando, setSorteando] = useState(false);
  const [ganhadores, setGanhadores] = useState<GanhadorAdmin[] | null>(null);

  const carregarGanhadores = useCallback(async () => {
    try {
      const { ganhadores } = await adminApi<{ ganhadores: GanhadorAdmin[] }>("listarGanhadores", { sorteioId: sorteio.id });
      setGanhadores(ganhadores);
    } catch {}
  }, [sorteio.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregarGanhadores(); }, [carregarGanhadores]);

  const alternarStatus = async () => {
    const status = sorteio.status === "aberto" ? "encerrado" : "aberto";
    if (status === "encerrado" && !(await popup.confirmar("Ninguém mais consegue entrar. Dá pra reabrir depois.", { titulo: "Encerrar inscrições?", textoOk: "Encerrar" }))) return;
    try {
      await adminApi("statusSorteio", { id: sorteio.id, status });
      onMudou();
    } catch (err) {
      popup.erro(err);
    }
  };

  const excluir = async () => {
    const ok = await popup.confirmar(
      `"${sorteio.titulo}" será apagado junto com ${chat ? "a lista do chat" : `${formatarNumero(sorteio.tickets + sorteio.pendentes)} tickets e os prints`} e os ganhadores. Não dá pra desfazer.`,
      { titulo: "Excluir sorteio?", textoOk: "Excluir" }
    );
    if (!ok) return;
    try {
      await adminApi("excluirSorteio", { id: sorteio.id });
      onMudou();
    } catch (err) {
      popup.erro(err);
    }
  };

  const excluirGanhador = async (g: GanhadorAdmin) => {
    if (!(await popup.confirmar(`${g.nome} sai da lista de ganhadores (o giro continua registrado no provably fair).`, { titulo: "Tirar ganhador?", textoOk: "Tirar" }))) return;
    try {
      await adminApi("excluirGanhador", { id: g.id });
      carregarGanhadores();
    } catch (err) {
      popup.erro(err);
    }
  };

  return (
    <section className="bg-carvao min-w-0">
      <div className="grid sm:grid-cols-[160px_1fr] gap-5 p-5 border-b border-grafite">
        <div className="aspect-square fundo-premio grid place-items-center overflow-hidden">
          {sorteio.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sorteio.imagem_url} alt="" className="w-[90%] h-[90%] object-contain" />
          ) : <Gift className="w-12 h-12 text-grafite-2" />}
        </div>
        <div className="min-w-0">
          <p className="text-vermelho font-bold">{chat ? "Sorteio do chat" : "Sorteio por depósito"}{sorteio.status === "encerrado" ? ", encerrado" : ""}</p>
          <h2 className="font-display font-black uppercase text-[44px] leading-[.95] break-words">{sorteio.titulo}</h2>
          <p className="text-cinza">
            {sorteio.valor != null && <b className="text-osso">{formatarReais(sorteio.valor)}</b>}
            {sorteio.fecha_em && ` Fecha em ${new Date(sorteio.fecha_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`}
          </p>
          {!chat && (
            <div className="flex gap-8 mt-3 text-cinza">
              <div><strong className="block text-osso font-display font-black text-[30px] leading-none">{formatarNumero(sorteio.coins)}</strong>coins aprovadas</div>
              <div><strong className="block text-osso font-display font-black text-[30px] leading-none">{formatarNumero(sorteio.tickets)}</strong>tickets aprovados</div>
              <div><strong className="block text-osso font-display font-black text-[30px] leading-none">{formatarNumero(sorteio.pendentes)}</strong>pendentes</div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {!chat && (
              <button onClick={() => setSorteando(true)} disabled={sorteio.tickets === 0} className="btn btn-vermelho !py-2.5 !px-4 !text-base" title={sorteio.tickets === 0 ? "Aprove algum ticket antes" : undefined}>
                <Dices className="w-5 h-5" /> Sortear
              </button>
            )}
            <button onClick={alternarStatus} className="btn btn-cinza !py-2.5 !px-4 !text-base">
              {sorteio.status === "aberto" ? <><Lock className="w-4 h-4" /> Encerrar</> : <><Unlock className="w-4 h-4" /> Reabrir</>}
            </button>
            <button onClick={onEditar} className="btn btn-cinza !py-2.5 !px-4 !text-base"><Pencil className="w-4 h-4" /> Editar</button>
            <Link href={chat ? `/chat?id=${sorteio.id}` : "/#sorteios"} target="_blank" className="btn btn-cinza !py-2.5 !px-4 !text-base"><ExternalLink className="w-4 h-4" /> Ver no site</Link>
            <button onClick={excluir} className="btn btn-cinza !py-2.5 !px-4 !text-base" aria-label="Excluir sorteio"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-grafite" role="tablist">
        {([
          ["principal", chat ? <><MessageSquare className="w-4 h-4" /> Chat ao vivo</> : <><Ticket className="w-4 h-4" /> Tickets</>],
          ["ganhadores", <><Trophy className="w-4 h-4" /> Ganhadores{ganhadores?.length ? ` (${ganhadores.length})` : ""}</>],
        ] as const).map(([id, rotulo]) => (
          <button key={id} role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={`flex items-center gap-2 px-5 py-3.5 font-bold border-b-2 -mb-px ${aba === id ? "border-vermelho text-osso" : "border-transparent text-cinza hover:text-osso"}`}>
            {rotulo}
          </button>
        ))}
      </div>

      <div className="p-5">
        {aba === "principal" ? (
          chat ? (
            <ChatAoVivo sorteio={sorteio} onMudou={() => { onMudou(); carregarGanhadores(); }} />
          ) : (
            <TicketsSorteio sorteioId={sorteio.id} onMudou={onMudou} />
          )
        ) : !ganhadores ? (
          <Loader2 className="w-7 h-7 animate-spin text-vermelho" />
        ) : ganhadores.length === 0 ? (
          <p className="text-cinza bg-preto p-6">Ninguém ganhou este sorteio ainda.</p>
        ) : (
          <ul className="divide-y divide-grafite border-y border-grafite">
            {ganhadores.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-display font-black text-3xl text-vermelho w-10">{g.rodada}º</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-lg">{g.nome}</p>
                  {g.email && (
                    <p className="text-cinza text-sm">
                      {g.email}{g.casa ? `, ${nomeCasa(g.casa)} ID ${g.casa_id}` : ""}{g.coins != null ? `, ${formatarNumero(g.coins)} coins` : ""}
                    </p>
                  )}
                </div>
                {g.fair_draw_id && (
                  <Link href={`/provably-fair?id=${g.fair_draw_id}`} target="_blank" className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title="Prova do sorteio" aria-label="Prova do sorteio">
                    <ShieldCheck className="w-4 h-4" />
                  </Link>
                )}
                <button onClick={() => excluirGanhador(g)} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" aria-label="Tirar ganhador"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sorteando && (
        <Roleta
          sorteio={sorteio}
          onFechar={() => setSorteando(false)}
          onConfirmado={() => {
            setSorteando(false);
            setAba("ganhadores");
            carregarGanhadores();
            onMudou();
          }}
        />
      )}
    </section>
  );
}
