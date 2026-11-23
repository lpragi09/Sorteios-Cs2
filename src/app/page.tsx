"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Copy, ShieldCheck } from "lucide-react";
import SorteioCard from "@/components/SorteioCard";
import ModalParticipar from "@/components/ModalParticipar";
import { CASAS, CODIGO, formatarReais, type Ganhador, type SorteioPublico } from "@/lib/sorteios";
import { dataVersionQuery, useRefreshOnReturn } from "@/lib/freshData";

type Dados = { sorteios: SorteioPublico[]; ganhadores: Ganhador[] };

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

export default function Home() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [participando, setParticipando] = useState<SorteioPublico | null>(null);
  const [copiado, setCopiado] = useState(false);

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

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(CODIGO);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  };

  const abertos = dados?.sorteios.filter((s) => s.status === "aberto") ?? [];
  const encerrados = dados?.sorteios.filter((s) => s.status === "encerrado") ?? [];

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
              {abertos.map((s) => <SorteioCard key={s.id} sorteio={s} onParticipar={setParticipando} />)}
            </div>
          )}

          {encerrados.length > 0 && (
            <>
              <h3 className="font-display font-black uppercase text-[32px] leading-none mt-16 mb-6 text-cinza">Encerrados</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {encerrados.map((s) => <SorteioCard key={s.id} sorteio={s} onParticipar={setParticipando} />)}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="bg-vermelho text-white overflow-hidden whitespace-nowrap font-display font-black text-[22px] py-2.5" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => <span key={i} className="inline-block pr-10">USE O CÓDIGO {CODIGO}</span>)}
      </div>

      {/* Como participar */}
      <section id="participar" className="scroll-mt-20 py-20">
        <div className="mx-auto w-[min(1180px,100%-40px)]">
          <h2 className="font-display font-black uppercase leading-[.95] text-[clamp(40px,5vw,64px)]">Como participar</h2>
          <p className="text-cinza max-w-[56ch] mt-2 mb-10">Seu ticket entra no sorteio depois que a equipe confere o print.</p>
          <ol className="grid md:grid-cols-3 gap-0.5">
            <li className="bg-carvao p-7">
              <span className="block font-display font-black text-[64px] leading-none text-vermelho mb-2.5">1</span>
              <h3 className="text-[23px] font-bold mb-1.5">Deposite com o código</h3>
              <p className="text-cinza">Na {CASAS.map((c) => c.nome).join(" ou na ")}, use o código do Soares no depósito.</p>
              <button onClick={copiar} className="inline-flex items-center gap-3 mt-5 border border-dashed border-vermelho pl-3.5 pr-1.5 py-1.5 font-display font-black text-[26px] tracking-wide">
                {CODIGO}
                <span className="font-sans text-sm font-bold bg-vermelho text-white px-3 py-2 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> {copiado ? "Copiado" : "Copiar"}
                </span>
              </button>
            </li>
            <li className="bg-carvao p-7">
              <span className="block font-display font-black text-[64px] leading-none text-vermelho mb-2.5">2</span>
              <h3 className="text-[23px] font-bold mb-1.5">Tire print do depósito</h3>
              <p className="text-cinza">O print precisa mostrar o seu ID na casa e quantas coins você depositou.</p>
            </li>
            <li className="bg-carvao p-7">
              <span className="block font-display font-black text-[64px] leading-none text-vermelho mb-2.5">3</span>
              <h3 className="text-[23px] font-bold mb-1.5">Envie o seu ticket</h3>
              <p className="text-cinza">Entre com o Google, escolha o sorteio e mande o print com o seu ID e Instagram.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Parceiros */}
      <section id="parceiros" className="scroll-mt-20 pb-20">
        <div className="mx-auto w-[min(1180px,100%-40px)]">
          <h2 className="font-display font-black uppercase leading-[.95] text-[clamp(40px,5vw,64px)]">Parceiros</h2>
          <p className="text-cinza max-w-[56ch] mt-2 mb-10">Depósitos com o código {CODIGO} nessas casas valem ticket.</p>
          <div className="grid sm:grid-cols-[repeat(2,minmax(0,360px))] gap-6">
            {CASAS.map((c) => (
              <a key={c.id} href={c.link} target="_blank" rel="noreferrer" className="bg-carvao corte block transition-transform hover:-translate-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imagem} alt={`${c.nome}: ${c.destaque} com o código ${CODIGO}`} loading="lazy" className="w-full aspect-[3/4] object-cover" />
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
          <p className="text-cinza max-w-[56ch] mt-2 mb-10">Os últimos sorteios feitos na live.</p>
          <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-6 items-start">
            <div className="border-t border-grafite">
              {dados?.ganhadores.length ? (
                dados.ganhadores.map((g) => (
                  <div key={g.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[100px_1fr_auto] gap-x-4 gap-y-0.5 items-center py-4 border-b border-grafite">
                    <time className="text-cinza text-[15px] max-sm:col-span-2">{dataCurta(g.criado_em)}</time>
                    <div className="min-w-0">
                      <b className="block text-[19px] truncate">{g.nome}</b>
                      <span className="text-cinza text-[15px]">{g.sorteio_titulo}{g.rodada > 1 ? ` (rodada ${g.rodada})` : ""}</span>
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
                <p className="text-cinza py-6">{dados ? "Os ganhadores aparecem aqui depois do primeiro sorteio." : "Carregando..."}</p>
              )}
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

      {participando && <ModalParticipar sorteio={participando} onFechar={() => setParticipando(null)} />}
    </>
  );
}
