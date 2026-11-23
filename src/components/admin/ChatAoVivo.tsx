"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import tmi from "tmi.js";
import { Dices, Eraser, Pause, Play, RotateCcw, Search, UserX } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { avatarTwitch, chancesPorTier, ehComando, tierPelosBadges } from "@/lib/chat";
import { formatarNumero, type Sorteio } from "@/lib/sorteios";
import { usePopup } from "@/components/Popup";
import Roleta from "@/components/admin/Roleta";
import Paginacao, { usePaginacao } from "@/components/admin/Paginacao";

type Participante = { id: number; twitch_login: string; avatar_url: string | null; sub_tier: number; removido: boolean; criado_em: string };
type StatusBot = "conectando" | "conectado" | "desconectado";

// Sorteio pelo chat da Twitch: o painel lê o chat (tmi.js, sem precisar de login na Twitch)
// e manda pro servidor quem digitou o comando. Precisa ficar com esta tela aberta durante a live.
export default function ChatAoVivo({ sorteio, onMudou }: { sorteio: Sorteio & { chat: number }; onMudou: () => void }) {
  const popup = usePopup();
  const [captando, setCaptando] = useState(sorteio.captando);
  const [bot, setBot] = useState<StatusBot>("conectando");
  const [lista, setLista] = useState<Participante[]>([]);
  const [busca, setBusca] = useState("");
  const [sorteando, setSorteando] = useState(false);
  const [resposta, setResposta] = useState<string | null | undefined>(undefined);
  const [servidor, setServidor] = useState<string | null>(null); // captação pelo servidor (EventSub)
  const captandoRef = useRef(captando);
  const vistos = useRef(new Map<string, number>()); // login -> maior tier já enviado
  const aguardando = useRef<string | null>(null);

  useEffect(() => { captandoRef.current = captando; }, [captando]);

  const carregar = useCallback(async () => {
    try {
      const { participantes } = await adminApi<{ participantes: Participante[] }>("listarChat", { sorteioId: sorteio.id });
      setLista(participantes);
      for (const p of participantes) vistos.current.set(p.twitch_login, Math.max(vistos.current.get(p.twitch_login) ?? 0, p.sub_tier));
    } catch {}
  }, [sorteio.id]);

  // Lista atualizada a cada 3s (outros admins e quem entrou antes de abrir a tela)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state muda depois da resposta
    carregar();
    const t = setInterval(carregar, 3000);
    return () => clearInterval(t);
  }, [carregar]);

  // Bot do chat: conectado enquanto esta tela estiver aberta
  useEffect(() => {
    if (!sorteio.canal) return;
    const client = new tmi.Client({ channels: [sorteio.canal], connection: { reconnect: true, secure: true } });
    client.on("connected", () => setBot("conectado"));
    client.on("disconnected", () => setBot("desconectado"));
    client.on("reconnect", () => setBot("conectando"));

    client.on("message", (_canal, tags, mensagem, self) => {
      const login = tags.username?.toLowerCase();
      if (self || !login) return;

      // O ganhador sorteado respondeu no chat
      if (aguardando.current === login) {
        aguardando.current = null;
        setResposta(mensagem);
      }

      if (!captandoRef.current || !ehComando(mensagem, sorteio.comando)) return;
      const tier = tierPelosBadges(tags.badges as Record<string, string | undefined> | undefined, !!tags.subscriber);
      const anterior = vistos.current.get(login);
      if (anterior !== undefined && tier <= anterior) return; // já está na lista com esse tier
      vistos.current.set(login, tier);

      adminApi<{ novo?: boolean }>("entradaChat", { sorteioId: sorteio.id, login, tier })
        .then((r) => {
          if (r.novo) {
            setLista((l) => (l.some((p) => p.twitch_login === login) ? l : [{ id: -Date.now(), twitch_login: login, avatar_url: null, sub_tier: tier, removido: false, criado_em: new Date().toISOString() }, ...l]));
          }
        })
        .catch(() => {
          if (anterior === undefined) vistos.current.delete(login);
          else vistos.current.set(login, anterior);
        });
    });

    client.connect().catch(() => setBot("desconectado"));
    return () => {
      client.removeAllListeners();
      client.disconnect().catch(() => {});
    };
  }, [sorteio.id, sorteio.canal, sorteio.comando]);

  const alternarCaptacao = async () => {
    const novo = !captando;
    setCaptando(novo);
    try {
      const r = await adminApi<{ servidor: string }>("captarChat", { sorteioId: sorteio.id, captando: novo });
      setServidor(r.servidor);
      onMudou();
    } catch (err) {
      setCaptando(!novo);
      popup.erro(err);
    }
  };

  const alternarRemovido = async (p: Participante) => {
    setLista((l) => l.map((x) => (x.twitch_login === p.twitch_login ? { ...x, removido: !p.removido } : x)));
    try {
      await adminApi("removerChat", { id: p.id, removido: !p.removido });
    } catch (err) {
      popup.erro(err);
      carregar();
    }
  };

  const limparLista = async () => {
    if (!(await popup.confirmar("Todo mundo que entrou pelo chat sai da lista. Útil pra começar uma rodada nova do zero.", { titulo: "Limpar a lista?", textoOk: "Limpar" }))) return;
    try {
      await adminApi("limparChat", { sorteioId: sorteio.id });
      vistos.current.clear();
      setLista([]);
      onMudou();
    } catch (err) {
      popup.erro(err);
    }
  };

  const ativos = lista.filter((p) => !p.removido);
  const totalChances = ativos.reduce((t, p) => t + chancesPorTier(p.sub_tier, sorteio), 0);
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase().replace(/^@/, "");
    return lista.filter((p) => !q || p.twitch_login.includes(q));
  }, [lista, busca]);
  const pag = usePaginacao(filtrados, 30);

  const corBot = bot === "conectado" ? "bg-osso" : bot === "conectando" ? "bg-cinza animate-pisca" : "bg-vermelho";

  return (
    <div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start bg-preto p-5 mb-5">
        <div>
          <p className="flex items-center gap-2 font-bold">
            <i className={`w-2.5 h-2.5 rounded-full ${corBot}`} aria-hidden />
            {bot === "conectado" ? `Lendo o chat de twitch.tv/${sorteio.canal}` : bot === "conectando" ? "Conectando no chat..." : "Desconectado do chat"}
          </p>
          <p className="text-cinza mt-1">
            {captando ? <>Chat aberto: quem digitar <b className="text-osso font-mono">{sorteio.comando}</b> entra.</> : "Chat fechado: ninguém novo entra."}{" "}
            {servidor === "ligada" ? "O servidor também está captando, então dá pra fechar esta tela." : "Deixe esta tela aberta durante a live."}
          </p>
          {servidor === "precisa_autorizar" && (
            <p className="mt-2 text-[15px]">
              Pra captar mesmo com o painel fechado, o dono do canal precisa autorizar o site uma vez:{" "}
              <a href="/api/twitch/autorizar" className="font-bold border-b-2 border-vermelho">Autorizar na Twitch</a>
            </p>
          )}
          {servidor === "erro" && <p className="mt-2 text-[15px] text-vermelho">A captação pelo servidor não ligou; o painel segue captando enquanto estiver aberto.</p>}
          <div className="flex gap-8 mt-3 text-cinza">
            <div><strong className="block text-osso font-display font-black text-[34px] leading-none">{formatarNumero(ativos.length)}</strong>no sorteio</div>
            <div><strong className="block text-osso font-display font-black text-[34px] leading-none">{formatarNumero(totalChances)}</strong>chances</div>
          </div>
        </div>
        <div className="flex flex-wrap sm:flex-col gap-2">
          <button onClick={alternarCaptacao} disabled={sorteio.status !== "aberto"} className={`btn ${captando ? "btn-cinza" : "btn-vermelho"}`}>
            {captando ? <><Pause className="w-5 h-5" /> Fechar chat</> : <><Play className="w-5 h-5" /> Abrir chat</>}
          </button>
          <button onClick={() => setSorteando(true)} disabled={ativos.length === 0} className="btn btn-vermelho"><Dices className="w-5 h-5" /> Sortear</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar no chat" className="campo !py-2 !pl-9" aria-label="Procurar participante" />
        </label>
        <button onClick={limparLista} disabled={lista.length === 0} className="ml-auto h-10 px-3 bg-grafite hover:bg-grafite-2 font-bold flex items-center gap-1.5 disabled:opacity-40"><Eraser className="w-4 h-4" /> Limpar lista</button>
      </div>

      {filtrados.length === 0 ? (
        <p className="text-cinza bg-preto p-6">{captando ? `Esperando alguém digitar ${sorteio.comando} no chat.` : "Abra o chat pra começar a receber participantes."}</p>
      ) : (
        <>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
            {pag.itensPagina.map((p) => (
              <li key={p.twitch_login} className={`bg-preto flex items-center gap-2.5 p-2.5 ${p.removido ? "opacity-40" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarTwitch(p.twitch_login, p.avatar_url)} alt="" className="w-9 h-9" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className={`font-bold truncate ${p.removido ? "line-through" : ""}`}>{p.twitch_login}</p>
                  <p className="text-cinza text-sm">{p.sub_tier ? `Sub T${p.sub_tier}, ` : ""}{chancesPorTier(p.sub_tier, sorteio)} chance(s)</p>
                </div>
                {p.id > 0 && (
                  <button onClick={() => alternarRemovido(p)} className="w-9 h-9 grid place-items-center text-cinza hover:text-osso hover:bg-grafite" title={p.removido ? "Voltar pra lista" : "Tirar da lista"} aria-label={p.removido ? "Voltar pra lista" : "Tirar da lista"}>
                    {p.removido ? <RotateCcw className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Paginacao {...pag} />
        </>
      )}

      {sorteando && (
        <Roleta
          sorteio={sorteio}
          resposta={resposta}
          onSorteado={(login) => {
            aguardando.current = login;
            setResposta(login ? null : undefined);
          }}
          onFechar={() => {
            aguardando.current = null;
            setResposta(undefined);
            setSorteando(false);
          }}
          onConfirmado={() => {
            aguardando.current = null;
            setResposta(undefined);
            setSorteando(false);
            onMudou();
          }}
        />
      )}
    </div>
  );
}
