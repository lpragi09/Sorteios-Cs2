"use client";

import { useState } from "react";
import { Check, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { CODIGO, type Parceiro } from "@/lib/sorteios";

/** Os 3 passos da home, cada um com uma amostra do que a pessoa vai fazer. */
export default function ComoParticipar({ parceiros }: { parceiros: Parceiro[] }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(CODIGO);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  };

  return (
    <section id="participar" className="scroll-mt-20 py-20 relative overflow-hidden">
      {/* Brilho vermelho atrás da seção */}
      <div aria-hidden className="absolute inset-x-0 top-1/3 h-[420px] bg-[radial-gradient(ellipse_at_center,rgba(227,16,31,.13),transparent_65%)] pointer-events-none" />

      <div className="relative mx-auto w-[min(1180px,100%-40px)]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display font-black uppercase leading-[.95] text-[clamp(40px,5vw,64px)]">Como participar</h2>
            <p className="text-cinza max-w-[56ch] mt-2">Três passos. Seu ticket entra no sorteio assim que a equipe confere o print.</p>
          </div>
          <p className="font-display font-black uppercase text-[22px] leading-none text-cinza">
            1 coin = <span className="text-osso">1 chance</span>
          </p>
        </div>

        <ol className="grid lg:grid-cols-3 gap-5">
          {/* 1. Código */}
          <Passo n={1} titulo="Deposite com o código" texto="Use o código do Soares na hora do depósito, em qualquer casa parceira.">
            <div className="h-full flex flex-col justify-center gap-4">
              <button
                onClick={copiar}
                className="group self-start flex items-stretch border-2 border-dashed border-vermelho bg-preto/60 hover:bg-preto transition-colors"
                aria-label={`Copiar o código ${CODIGO}`}
              >
                <span className="font-display font-black text-[44px] leading-none tracking-wider px-4 py-2.5">{CODIGO}</span>
                <span className="flex items-center gap-1.5 bg-vermelho group-hover:bg-vermelho-claro text-white font-bold text-sm px-3.5">
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiado ? "Copiado" : "Copiar"}
                </span>
              </button>
              <div className="flex flex-wrap gap-2">
                {parceiros.map((c) => (
                  <a
                    key={c.id}
                    href={c.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-grafite hover:bg-grafite-2 px-3 py-1.5 font-bold text-[15px] transition-colors"
                  >
                    {c.nome} <ExternalLink className="w-3.5 h-3.5 text-cinza" />
                  </a>
                ))}
              </div>
            </div>
          </Passo>

          {/* 2. Print */}
          <Passo n={2} titulo="Tire print do depósito" texto="No print precisam aparecer o seu ID na casa e quantas coins você depositou.">
            <div aria-hidden className="h-full grid place-items-center">
              <div className="w-full max-w-[290px] bg-preto border border-grafite text-[14px]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-grafite">
                  <span className="font-bold">Depósito concluído</span>
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-[#1f9d55]"><Check className="w-3.5 h-3.5 text-white" /></span>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  <Linha rotulo="ID da conta" valor="7.482.193" marcado />
                  <Linha rotulo="Código" valor={CODIGO} />
                  <Linha rotulo="Coins" valor="1.250" marcado />
                </div>
              </div>
            </div>
          </Passo>

          {/* 3. Ticket */}
          <Passo n={3} titulo="Envie o seu ticket" texto="Entre com o Google, escolha o sorteio e mande o print junto com o seu ID e Instagram.">
            <div className="h-full flex flex-col justify-center gap-4">
              <div aria-hidden className="flex bg-osso text-preto max-w-[290px] [clip-path:polygon(0_0,100%_0,100%_38%,96%_50%,100%_62%,100%_100%,0_100%,0_62%,4%_50%,0_38%)]">
                <div className="bg-vermelho text-white font-display font-black text-[15px] tracking-widest grid place-items-center px-2 [writing-mode:vertical-rl] rotate-180">
                  TICKET
                </div>
                <div className="flex-1 px-4 py-3 border-l-2 border-dashed border-preto/25">
                  <p className="font-display font-black text-[22px] leading-none uppercase">Sorteio da semana</p>
                  <p className="text-[14px] font-semibold text-preto/60 mt-1">@seu.instagram</p>
                  <p className="font-display font-black text-[18px] text-vermelho mt-1.5">1.250 chances</p>
                </div>
              </div>
              <a href="#sorteios" className="self-start flex items-center gap-1 font-bold border-b-2 border-vermelho hover:text-vermelho-claro">
                Escolher sorteio <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </Passo>
        </ol>
      </div>
    </section>
  );
}

function Passo({ n, titulo, texto, children }: { n: number; titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <li className="group relative flex">
      {/* Seta ligando um passo ao próximo (fora do recorte do cartão) */}
      {n < 3 && (
        <span aria-hidden className="hidden lg:block absolute z-10 -right-[19px] top-[94px] w-6 h-8 bg-vermelho [clip-path:polygon(0_0,55%_0,100%_50%,55%_100%,0_100%,45%_50%)]" />
      )}
      <div className="flex-1 bg-carvao corte flex flex-col">
        <div className="relative h-[220px] p-6 border-b border-grafite bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:22px_22px]">
          {children}
        </div>
        <div className="relative p-6 pt-5 flex-1 overflow-hidden">
          <span aria-hidden className="absolute -right-2 -bottom-8 font-display font-black text-[150px] leading-none text-transparent [-webkit-text-stroke:2px_rgba(227,16,31,.35)] group-hover:[-webkit-text-stroke:2px_rgba(227,16,31,.7)] transition-all select-none">
            {n}
          </span>
          <p className="font-display font-black text-vermelho text-[18px] uppercase tracking-wider">Passo {n}</p>
          <h3 className="text-[25px] font-bold leading-tight mt-0.5 mb-1.5">{titulo}</h3>
          <p className="text-cinza max-w-[30ch] relative">{texto}</p>
        </div>
      </div>
    </li>
  );
}

function Linha({ rotulo, valor, marcado = false }: { rotulo: string; valor: string; marcado?: boolean }) {
  return (
    <div className={`flex justify-between items-center px-2 py-1 ${marcado ? "outline-2 outline-vermelho outline-offset-0 bg-vermelho/10" : ""}`}>
      <span className="text-cinza">{rotulo}</span>
      <b className="font-bold">{valor}</b>
    </div>
  );
}
