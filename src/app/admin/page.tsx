"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Dices, ExternalLink, Gift, Handshake, Loader2, Lock, MessageSquare, Pencil, Plus, Radio, ShieldCheck, Ticket, Trash2, Trophy, Unlock, User } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { formatarNumero, formatarReais, nomeCasa, type Sorteio, type TipoSorteio } from "@/lib/sorteios";
import { usePopup } from "@/components/Popup";
import FormSorteio from "@/components/admin/FormSorteio";
import TicketsSorteio from "@/components/admin/TicketsSorteio";
import ChatAoVivo from "@/components/admin/ChatAoVivo";
import Roleta from "@/components/admin/Roleta";
import SecaoProvablyFair from "@/components/admin/SecaoProvablyFair";
import SecaoVencedores from "@/components/admin/SecaoVencedores";
import SecaoUsuarios from "@/components/admin/SecaoUsuarios";
import SecaoParceiros from "@/components/admin/SecaoParceiros";

type SorteioAdmin = Sorteio & { tickets: number; coins: number; pendentes: number; chat: number };
type GanhadorAdmin = { id: number; rodada: number; nome: string; email: string | null; casa: string | null; casa_id: string | null; coins: number | null; fair_draw_id: string | null; criado_em: string };

const ABAS = [
  { id: "mensais", nome: "Sorteios Mensais", Icone: Gift },
  { id: "diario", nome: "Sorteio Diário (Live)", Icone: Radio },
  { id: "provably-fair", nome: "Provably Fair", Icone: ShieldCheck },
  { id: "vencedores", nome: "Vencedores dos Sorteios", Icone: Trophy },
  { id: "usuarios", nome: "Usuários do Site", Icone: User },
  { id: "parceiros", nome: "Parceiros", Icone: Handshake },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const abaDaUrl = (): Aba => {
  if (typeof window === "undefined") return "mensais";
  const a = new URLSearchParams(window.location.search).get("aba");
  return ABAS.some((x) => x.id === a) ? (a as Aba) : "mensais";
};

export default function Admin() {
  const { data: session, status } = useSession();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  const popup = usePopup();
  const [aba, setAba] = useState<Aba>(abaDaUrl);

  const trocarAba = (a: Aba) => {
    setAba(a);
    window.history.replaceState(null, "", a === "mensais" ? "/admin" : `/admin?aba=${a}`);
    window.scrollTo({ top: 0 });
  };

  // Volta da autorização da Twitch (/api/twitch/callback manda ?twitch=ok:login)
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("twitch");
    if (!r) return;
    window.history.replaceState(null, "", "/admin?aba=diario");
    if (r.startsWith("ok")) {
      const login = r.split(":")[1];
      popup.alerta(`${login ? `A conta ${login} autorizou` : "Autorizado"}. Feche e abra o chat do sorteio de novo pra ligar a captação pelo servidor.`, { tipo: "sucesso", titulo: "Twitch autorizada" });
    } else if (r !== "cancelado") {
      popup.alerta("Não foi possível concluir a autorização na Twitch. Tente de novo.", { tipo: "erro" });
    }
  }, [popup]);

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

  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <div className="mx-auto w-[min(1440px,100%-32px)] py-8 grid lg:grid-cols-[260px_1fr] gap-6 items-start">
      <aside className="lg:sticky lg:top-24">
        <p className="font-display font-black uppercase text-[34px] leading-none mb-5">
          Painel <span className="text-vermelho">admin</span>
        </p>
        <nav aria-label="Seções do painel">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {ABAS.map(({ id, nome, Icone }) => (
              <li key={id} className="shrink-0">
                <button
                  onClick={() => trocarAba(id)}
                  aria-current={aba === id ? "page" : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold border-l-4 transition-colors ${
                    aba === id ? "bg-sangue/40 border-vermelho text-osso" : "border-transparent text-cinza hover:text-osso hover:bg-carvao"
                  }`}
                >
                  <Icone className="w-5 h-5 shrink-0" /> {nome}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section className="min-w-0">
        <h1 className="font-display font-black uppercase text-[clamp(36px,4.5vw,56px)] leading-none mb-6">{atual.nome}</h1>
        {aba === "mensais" && <SecaoSorteios key="ticket" tipo="ticket" />}
        {aba === "diario" && <SecaoSorteios key="chat" tipo="chat" />}
        {aba === "provably-fair" && <SecaoProvablyFair />}
        {aba === "vencedores" && <SecaoVencedores />}
        {aba === "usuarios" && <SecaoUsuarios />}
        {aba === "parceiros" && <SecaoParceiros />}
      </section>
    </div>
  );
}

// Lista + detalhe dos sorteios de um tipo (Mensais = por depósito, Diário = chat da live)
function SecaoSorteios({ tipo }: { tipo: TipoSorteio }) {
  const popup = usePopup();
  const [sorteios, setSorteios] = useState<SorteioAdmin[] | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [form, setForm] = useState<{ sorteio: Sorteio | null } | null>(null);
  const chat = tipo === "chat";

  const carregar = useCallback(async () => {
    try {
      const { sorteios: todos } = await adminApi<{ sorteios: SorteioAdmin[] }>("listarSorteios");
      const lista = todos.filter((s) => s.tipo === tipo);
      setSorteios(lista);
      setSelecionadoId((atual) => (atual && lista.some((s) => s.id === atual) ? atual : lista[0]?.id ?? null));
    } catch (err) {
      popup.erro(err);
    }
  }, [popup, tipo]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregar(); }, [carregar]);

  const selecionado = sorteios?.find((s) => s.id === selecionadoId) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-cinza max-w-[60ch]">
          {chat
            ? "Quem digita o comando no chat da Twitch entra. Sub tem mais chances. Abra o chat durante a live e sorteie na hora."
            : "Quem deposita com o código SOARES manda o print. Você aprova os tickets e cada coin aprovada vale uma chance."}
        </p>
        <button onClick={() => setForm({ sorteio: null })} className="btn btn-vermelho !py-2.5"><Plus className="w-5 h-5" /> {chat ? "Novo sorteio da live" : "Novo sorteio mensal"}</button>
      </div>

      {!sorteios ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>
      ) : sorteios.length === 0 ? (
        <div className="bg-carvao p-8 border-l-4 border-vermelho">
          <p className="font-bold text-lg">Nenhum {chat ? "sorteio da live" : "sorteio mensal"} criado ainda.</p>
          <p className="text-cinza mt-1">Clique em &quot;{chat ? "Novo sorteio da live" : "Novo sorteio mensal"}&quot; pra começar.</p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-[300px_1fr] gap-6 items-start">
          <ul className="flex flex-col gap-0.5 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto">
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
                    ) : chat ? <MessageSquare className="w-5 h-5 text-cinza" /> : <Gift className="w-5 h-5 text-cinza" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{s.titulo}</b>
                    <span className="text-cinza text-sm">
                      {s.status === "encerrado" ? "Encerrado" : chat ? (s.captando ? "Chat aberto" : "Chat fechado") : "Aberto"}
                      {chat ? `, ${formatarNumero(s.chat)} no chat` : `, ${formatarNumero(s.tickets)} tickets`}
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
          tipoNovo={tipo}
          onFechar={() => setForm(null)}
          onSalvo={(s) => {
            setForm(null);
            setSelecionadoId(s.id);
            carregar();
          }}
        />
      )}
    </>
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
