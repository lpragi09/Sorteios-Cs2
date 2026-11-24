"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Gift, Loader2, Search, ShieldCheck, Trophy } from "lucide-react";
import { avatarTwitch } from "@/lib/chat";
import Paginacao, { usePaginacao } from "@/components/Paginacao";
import { formatarNumero, formatarReais, type Sorteio } from "@/lib/sorteios";

type Participante = { twitch_login: string; avatar_url: string | null; sub_tier: number; chances: number; criado_em: string };
type GanhadorChat = { rodada: number; nome: string; criado_em: string; fair_draw_id: string | null };
type Dados = { sorteio: Sorteio | null; participantes: Participante[]; ganhadores: GanhadorChat[] };

const ATUALIZA_MS = 4000;
const POR_PAGINA = 30;

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>}>
      <SorteioChat />
    </Suspense>
  );
}

function SorteioChat() {
  const id = useSearchParams().get("id");
  const [dados, setDados] = useState<Dados | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat${id ? `?id=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" });
      if (res.ok) setDados(await res.json());
    } catch {}
  }, [id]);

  // Atualiza sozinho enquanto o chat está aberto e a aba está visível
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
    carregar();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, ATUALIZA_MS);
    return () => clearInterval(t);
  }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase().replace(/^@/, "");
    return (dados?.participantes ?? []).filter((p) => !q || p.twitch_login.includes(q));
  }, [dados, busca]);
  const pag = usePaginacao(filtrados, POR_PAGINA);
  const pagGanhadores = usePaginacao(dados?.ganhadores ?? []);

  if (!dados) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-vermelho" /></div>;

  const s = dados.sorteio;
  if (!s) {
    return (
      <div className="mx-auto w-[min(1000px,100%-40px)] py-16">
        <h1 className="font-display font-black uppercase leading-[.9] text-[clamp(48px,7vw,88px)]">Sorteio do chat</h1>
        <div className="bg-carvao p-8 mt-8 border-l-4 border-vermelho">
          <p className="font-bold text-lg">Nenhum sorteio no chat agora.</p>
          <p className="text-cinza mt-1">Quando o Soares abrir um na live, é só digitar o comando no chat da Twitch e você aparece aqui.</p>
          <a href="https://www.twitch.tv/soares" target="_blank" rel="noreferrer" className="btn btn-vermelho mt-5">Abrir a live</a>
        </div>
      </div>
    );
  }

  const aberto = s.status === "aberto" && s.captando;
  const totalChances = dados.participantes.reduce((t, p) => t + p.chances, 0);

  return (
    <div className="mx-auto w-[min(1180px,100%-40px)] py-14">
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div>
          <p className={`inline-flex items-center gap-2 font-bold px-3 py-1 ${aberto ? "bg-vermelho text-white" : "bg-grafite text-cinza"}`}>
            {aberto && <i className="w-2 h-2 rounded-full bg-white animate-pisca" aria-hidden />}
            {aberto ? "Chat aberto" : s.status === "encerrado" ? "Sorteio encerrado" : "Chat fechado"}
          </p>
          <h1 className="font-display font-black uppercase leading-[.88] text-[clamp(48px,7vw,96px)] mt-4">{s.titulo}</h1>
          {s.valor != null && <p className="font-display font-black text-vermelho text-[40px] leading-none mt-2">{formatarReais(s.valor)}</p>}
          {aberto && (
            <p className="text-xl mt-5">
              Digite <b className="bg-carvao px-2 py-0.5 font-mono">{s.comando}</b> no chat da{" "}
              <a href={`https://www.twitch.tv/${s.canal ?? "soares"}`} target="_blank" rel="noreferrer" className="border-b-2 border-vermelho font-bold">Twitch</a>{" "}
              pra entrar.
            </p>
          )}
          <p className="text-cinza mt-3">
            Quem não é sub tem 1 chance. Sub tier 1 tem {s.chance_t1}, tier 2 tem {s.chance_t2} e tier 3 tem {s.chance_t3}.
          </p>
          <div className="flex gap-10 mt-7 text-cinza">
            <div><strong className="block text-osso font-display font-black text-[42px] leading-none">{formatarNumero(dados.participantes.length)}</strong>no sorteio</div>
            <div><strong className="block text-osso font-display font-black text-[42px] leading-none">{formatarNumero(totalChances)}</strong>chances</div>
          </div>
        </div>

        <div className="bg-carvao corte overflow-hidden">
          <div className="aspect-[4/3] fundo-premio grid place-items-center">
            {s.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imagem_url} alt={s.titulo} className="w-[86%] h-[86%] object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.7)]" />
            ) : (
              <Gift className="w-20 h-20 text-grafite-2" />
            )}
          </div>
          {dados.ganhadores.length > 0 && (
            <div className="p-5 border-t border-grafite">
              <p className="font-display font-black uppercase text-2xl mb-2">Ganhadores</p>
              {pagGanhadores.itensPagina.map((g) => (
                <div key={g.rodada} className="flex items-center gap-2 py-1.5">
                  <Trophy className="w-5 h-5 text-vermelho" />
                  <b className="text-lg">{g.nome}</b>
                  {g.fair_draw_id && (
                    <Link href={`/provably-fair?id=${g.fair_draw_id}`} className="ml-auto text-cinza hover:text-osso" title="Conferir este giro">
                      <ShieldCheck className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              ))}
              <Paginacao {...pagGanhadores} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <h2 className="font-display font-black uppercase text-[40px] leading-none">Quem entrou</h2>
          <label className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cinza" />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); pag.setPagina(1); }} placeholder="Procurar seu nome" className="campo !pl-9" aria-label="Procurar participante" />
          </label>
        </div>
        {filtrados.length === 0 ? (
          <p className="text-cinza bg-carvao p-6">{busca ? "Ninguém com esse nome na lista." : "Ninguém entrou ainda."}</p>
        ) : (
          <>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0.5">
              {pag.itensPagina.map((p) => (
                <li key={p.twitch_login} className="bg-carvao flex items-center gap-2.5 p-2.5 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarTwitch(p.twitch_login, p.avatar_url)} alt="" className="w-9 h-9 shrink-0" loading="lazy" />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{p.twitch_login}</p>
                    <p className="text-cinza text-sm">{p.sub_tier ? `Sub T${p.sub_tier}, ` : ""}{p.chances} {p.chances === 1 ? "chance" : "chances"}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Paginacao {...pag} />
          </>
        )}
      </div>
    </div>
  );
}
