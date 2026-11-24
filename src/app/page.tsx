"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import SorteioCard from "@/components/SorteioCard";
import ModalParticipar from "@/components/ModalParticipar";
import ComoParticipar from "@/components/ComoParticipar";
import { CODIGO, formatarReais, PARCEIROS_PADRAO, type Ganhador, type Parceiro, type SorteioPublico } from "@/lib/sorteios";
import { dataVersionQuery, useRefreshOnReturn } from "@/lib/freshData";
import Paginacao, { usePaginacao } from "@/components/Paginacao";

type Dados = { sorteios: SorteioPublico[]; ganhadores: Ganhador[]; parceiros: Parceiro[] };

/** Foto de quem ganhou; sem foto (ou se o link quebrar), a inicial. */
function FotoGanhador({ src, nome }: { src: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  if (!src || falhou) {
    return (
      <span className="w-11 h-11 shrink-0 rounded-full bg-sangue text-white font-display font-black text-xl grid place-items-center uppercase">
        {nome.replace(/^@/, "").charAt(0) || "?"}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className="w-11 h-11 shrink-0 rounded-full object-cover bg-grafite" />;
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

export default function Home() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [participando, setParticipando] = useState<SorteioPublico | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/home${dataVersionQuery()}`);
      if (!res.ok) throw new Error();
      setDados(await res.json());
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregar(); }, [carregar]);
  useRefreshOnReturn(carregar);

  const abertos = dados?.sorteios.filter((s) => s.status === "aberto") ?? [];
  const encerrados = dados?.sorteios.filter((s) => s.status === "encerrado") ?? [];
  const parceiros = dados?.parceiros?.length ? dados.parceiros : PARCEIROS_PADRAO;
  const pagAbertos = usePaginacao(abertos, 6);
  const pagEncerrados = usePaginacao(encerrados, 6);
  const pagGanhadores = usePaginacao(dados?.ganhadores ?? [], 8);

  return (
    <>
      {/* Abertura: a arte do Soares em tela cheia */}
      <section className="relative overflow-hidden lg:min-h-[min(calc(100svh-72px),900px)] lg:flex lg:items-end">
        {/* Arte do Soares animada em loop; a capa aparece enquanto o vídeo carrega */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/hero-poster.webp"
          aria-label="Ilustração do Soares sentado nas caixas do bombsite A, segurando uma karambit"
          className="w-full aspect-[4/3] object-cover object-[62%_30%] pointer-events-none lg:absolute lg:inset-0 lg:h-full lg:aspect-auto lg:object-[60%_30%] animate-aproxima"
        >
          {/* 1280px no celular e 1920px no computador (ampliados com IA a partir do original de 1024px) */}
          <source src="/hero-720.mp4" type="video/mp4" media="(max-width: 768px)" />
          <source src="/hero-1080.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,11,0)_40%,#0a0a0b_75%)] lg:bg-[linear-gradient(to_bottom,rgba(10,10,11,0)_45%,rgba(10,10,11,.75)_80%,#0a0a0b_100%),linear-gradient(to_right,rgba(10,10,11,.7)_0%,rgba(10,10,11,0)_45%)]" />
        <div className="relative z-10 mx-auto w-[min(1180px,100%-40px)] -mt-24 pb-10 lg:mt-0 lg:pb-16">
          <h1 className="font-display font-black uppercase leading-[.85] text-[clamp(56px,8vw,120px)] max-w-[9ch]">Sorteios do Soares</h1>
          <p className="text-[#cfcfd4] text-xl mt-4 mb-7 max-w-[38ch]">
            Skin de CS2 sorteada na live. Deposite com o código {CODIGO} e mande o print pra entrar.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#sorteios" className="btn btn-vermelho max-sm:w-full">Ver sorteios abertos</a>
            <a href="https://www.twitch.tv/soares" target="_blank" rel="noreferrer" className="btn btn-cinza max-sm:w-full">Assistir na Twitch</a>
          </div>
        </div>
        <a href="#sorteios" aria-label="Ver sorteios abertos" className="hidden lg:block absolute z-10 left-1/2 bottom-5 -translate-x-1/2 text-osso/60 hover:text-osso">
          <ChevronDown className="w-7 h-7 animate-quica" />
        </a>
      </section>

      {/* Do fim do vídeo pra baixo: fundo com brilhos vermelhos */}
      <div className="fundo-home">
      {/* Sorteios */}
      <section id="sorteios" className="scroll-mt-20 py-20">
        <div className="mx-auto w-[min(1180px,100%-40px)]">
          <h2 className="font-display font-black uppercase leading-[.95] text-[clamp(40px,5vw,64px)]">Sorteios abertos</h2>
          <p className="text-cinza max-w-[56ch] mt-2 mb-10">Quanto mais coins você deposita com o código {CODIGO}, maior a sua chance.</p>

          {!dados && !erro && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Carregando sorteios">
              {[0, 1, 2].map((i) => <div key={i} className="bg-carvao corte aspect-[3/4] animate-pulse" />)}
            </div>
          )}
          {erro && (
            <div className="bg-carvao p-8 border-l-4 border-vermelho">
              <p className="font-bold text-lg">Não foi possível carregar os sorteios.</p>
              <button onClick={carregar} className="btn btn-cinza mt-4">Tentar de novo</button>
            </div>
          )}
          {dados && abertos.length === 0 && (
            <div className="bg-carvao p-8 border-l-4 border-vermelho">
              <p className="font-bold text-lg">Nenhum sorteio aberto agora.</p>
              <p className="text-cinza mt-1">O próximo é anunciado na live. Enquanto isso, já dá pra depositar com o código {CODIGO}.</p>
            </div>
          )}
          {abertos.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pagAbertos.itensPagina.map((s) => <SorteioCard key={s.id} sorteio={s} onParticipar={setParticipando} />)}
            </div>
          )}
          {abertos.length > 0 && (
            <Paginacao {...pagAbertos} />
          )}

          {encerrados.length > 0 && (
            <>
              <h3 className="font-display font-black uppercase text-[32px] leading-none mt-16 mb-6 text-cinza">Encerrados</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {pagEncerrados.itensPagina.map((s) => <SorteioCard key={s.id} sorteio={s} onParticipar={setParticipando} />)}
              </div>
              <Paginacao {...pagEncerrados} />
            </>
          )}
        </div>
      </section>

      {/* Faixa rolando sem parar: duas metades iguais, anda metade da largura e recomeça sem emenda */}
      <div className="bg-vermelho text-white overflow-hidden whitespace-nowrap font-display font-black text-[22px] py-2.5" aria-hidden>
        <div className="flex w-max animate-faixa hover:[animation-play-state:paused]">
          {[0, 1].map((metade) => (
            <div key={metade} className="flex shrink-0">
              {Array.from({ length: 10 }, (_, i) => <span key={i} className="pr-10">USE O CÓDIGO {CODIGO}</span>)}
            </div>
          ))}
        </div>
      </div>

      <ComoParticipar parceiros={parceiros} />

      {/* Parceiros */}
      <section id="parceiros" className="scroll-mt-20 pb-20">
        <div className="mx-auto w-[min(1180px,100%-40px)]">
          <h2 className="font-display font-black uppercase leading-[.95] text-[clamp(40px,5vw,64px)]">Parceiros</h2>
          <p className="text-cinza max-w-[56ch] mt-2 mb-10">Depósitos com o código {CODIGO} nessas casas valem ticket.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),360px))] gap-6">
            {parceiros.map((c) => (
              <a key={c.id} href={c.link} target="_blank" rel="noreferrer" className="bg-carvao corte block transition-transform hover:-translate-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imagem_url || "/hero-poster.webp"} alt={`${c.nome}${c.destaque ? `: ${c.destaque}` : ""} com o código ${CODIGO}`} loading="lazy" className="w-full aspect-[3/4] object-cover" />
                <div className="flex justify-between items-center px-4.5 py-3.5 font-bold text-[19px]">
                  {c.nome} <span className="text-vermelho text-[15px]">{c.destaque}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Ganhadores */}
      <section id="ganhadores" className="scroll-mt-20 pb-20">
        <div className="mx-auto w-[min(1180px,100%-40px)]">
          <h2 className="font-display font-black uppercase leading-[.95] text-[clamp(40px,5vw,64px)]">Quem já levou</h2>
          <p className="text-cinza max-w-[56ch] mt-2 mb-10">Quem ganhou nos últimos 30 dias.</p>
          <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-6 items-start">
            <div className="border-t border-grafite">
              {dados?.ganhadores.length ? (
                pagGanhadores.itensPagina.map((g) => (
                  <div key={g.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[100px_1fr_auto] gap-x-4 gap-y-0.5 items-center py-4 border-b border-grafite">
                    <time className="text-cinza text-[15px] max-sm:col-span-2">{dataCurta(g.criado_em)}</time>
                    <div className="min-w-0 flex items-center gap-3">
                      <FotoGanhador src={g.foto ?? null} nome={g.nome} />
                      <div className="min-w-0">
                        <b className="block text-[19px] truncate">{g.nome}</b>
                        <span className="text-cinza text-[15px]">{g.sorteio_titulo}{g.rodada > 1 ? ` (rodada ${g.rodada})` : ""}</span>
                      </div>
                    </div>
                    {g.fair_draw_id ? (
                      <Link href={`/provably-fair?id=${g.fair_draw_id}`} className="font-display font-black text-[28px] hover:text-vermelho" title="Conferir este sorteio">
                        {formatarReais(g.sorteio_valor) || "Conferir"}
                      </Link>
                    ) : (
                      <span className="font-display font-black text-[28px]">{formatarReais(g.sorteio_valor)}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-cinza py-6">{dados ? "Ninguém ganhou nos últimos 30 dias. O próximo ganhador aparece aqui." : "Carregando..."}</p>
              )}
              <Paginacao {...pagGanhadores} />
            </div>
            <div className="bg-carvao border-l-[3px] border-vermelho p-7">
              <ShieldCheck className="w-8 h-8 text-vermelho mb-3" />
              <h3 className="font-display font-black uppercase text-[34px] leading-none mb-3">Dá pra conferir cada sorteio</h3>
              <p className="text-cinza mb-4">
                A lista de participantes fica travada antes do giro e o número vem de um sorteio público (drand). Qualquer um refaz a conta e chega no mesmo ganhador.
              </p>
              <Link href="/provably-fair" className="font-bold border-b-2 border-vermelho">Como conferir um resultado</Link>
            </div>
          </div>
        </div>
      </section>

      </div>

      {participando && <ModalParticipar sorteio={participando} parceiros={parceiros} onFechar={() => setParticipando(null)} />}
    </>
  );
}
