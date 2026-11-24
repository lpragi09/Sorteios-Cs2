"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, ShieldCheck, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { FairDraw } from "@/lib/fair";
import { usePopup } from "@/components/Popup";
import { useSounds } from "@/lib/useSounds";

const ITEM_W = 200;
const ITEM_STEP = ITEM_W + 12;
const TAMANHO = 50;
const INDICE_GANHADOR = 40;
const GIRO_MS = 9000;
const CONTAGEM_MS = 900;

type Fase = "contagem" | "girando" | "resultado";
type Sorteado = { draw: FairDraw; fotos: Record<string, string> };
type Item = { nome: string; foto: string | null };

/** Foto da Twitch (diário) ou do Google (mensal); sem foto, a inicial. */
function Foto({ src, nome, tamanho }: { src: string | null; nome: string; tamanho: string }) {
  const [falhou, setFalhou] = useState(false);
  if (!src || falhou) {
    return (
      <span className={`${tamanho} shrink-0 rounded-full bg-sangue text-white font-display font-black grid place-items-center uppercase`}>
        {nome.replace(/^@/, "").charAt(0) || "?"}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className={`${tamanho} shrink-0 rounded-full object-cover bg-grafite`} />;
}

// Quem ganha sai do servidor (provably fair); a roleta só mostra.
// Animação por requestAnimationFrame + setTimeout que garante o resultado
// (funciona mesmo com "efeitos de animação" do Windows desligados).
export default function Roleta({ sorteio, onFechar, onConfirmado, onSorteado, resposta }: {
  sorteio: { id: string; titulo: string };
  onFechar: () => void;
  onConfirmado: () => void;
  /** Avisado quando sai um ganhador (o painel do chat passa a esperar a resposta dele). */
  onSorteado?: (label: string | null) => void;
  /** Mensagem que o ganhador mandou no chat depois de sorteado. */
  resposta?: string | null;
}) {
  const [fase, setFase] = useState<Fase>("contagem");
  const [numero, setNumero] = useState(3);
  const [esperando, setEsperando] = useState(false);
  const [giro, setGiro] = useState<FairDraw | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const faixaRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const giroId = useRef(0);
  const pedido = useRef<Promise<Sorteado> | null>(null);
  const sons = useSounds();
  const popup = usePopup();

  const limpar = () => {
    giroId.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const girar = ({ draw: d, fotos: f }: Sorteado) => {
    const nomes = d.entries.map((e) => e.label);
    const item = (nome: string): Item => ({ nome, foto: f[nome] ?? null });
    const faixa = Array.from({ length: TAMANHO }, () => item(nomes[Math.floor(Math.random() * nomes.length)]));
    faixa[INDICE_GANHADOR] = item(d.winner_label ?? "");
    setItens(faixa);
    setFotos(f);
    setGiro(d);
    setFase("girando");

    const id = ++giroId.current;
    const alvo = INDICE_GANHADOR * ITEM_STEP;
    let inicio = 0;
    let ultimo = -1;
    const quadro = (agora: number) => {
      const el = faixaRef.current;
      if (giroId.current !== id || !el) return;
      if (!inicio) inicio = agora;
      const t = Math.min(1, (agora - inicio) / GIRO_MS);
      const x = alvo * (1 - Math.pow(1 - t, 4));
      el.style.transform = `translateX(${-x}px)`;
      const i = Math.round(x / ITEM_STEP);
      if (i !== ultimo) {
        ultimo = i;
        sons.tick(t);
      }
      if (t < 1) requestAnimationFrame(quadro);
    };
    timers.current.push(
      setTimeout(() => requestAnimationFrame(quadro), 100),
      setTimeout(() => {
        giroId.current++;
        if (faixaRef.current) faixaRef.current.style.transform = `translateX(${-alvo}px)`;
        sons.win();
        setFase("resultado");
        onSorteado?.(d.winner_label);
      }, GIRO_MS + 100)
    );
  };

  // 3·2·1 enquanto o servidor congela a lista e espera o número público.
  // Cada número é um passo de state (sobrevive ao React desmontar/remontar em desenvolvimento).
  const comecar = () => {
    limpar();
    sons.unlock();
    setGiro(null);
    setNumero(3);
    setEsperando(false);
    setFase("contagem");
    onSorteado?.(null);
    const p = adminApi<Sorteado>("sortear", { sorteioId: sorteio.id }).then((r) => ({ draw: r.draw, fotos: r.fotos ?? {} }));
    p.catch(() => {});
    pedido.current = p;
  };

  useEffect(() => {
    if (fase !== "contagem" || esperando) return;
    sons.tick(numero === 1 ? 0.9 : numero === 2 ? 0.5 : 0.15);
    const t = setTimeout(() => (numero > 1 ? setNumero(numero - 1) : setEsperando(true)), CONTAGEM_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, numero, esperando]);

  // Contagem acabou: gira assim que o servidor responder (só uma vez por pedido)
  useEffect(() => {
    if (fase !== "contagem" || !esperando || !pedido.current) return;
    let ativo = true;
    pedido.current.then(
      (d) => { if (ativo) girar(d); },
      (err) => {
        if (!ativo) return;
        popup.erro(err, "Não foi possível sortear");
        onFechar();
      }
    );
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, esperando]);

  const iniciado = useRef(false); // o React em desenvolvimento roda o efeito duas vezes
  useEffect(() => {
    if (!iniciado.current) {
      iniciado.current = true;
      comecar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Ao fechar de verdade, para o giro e os timers
  useEffect(() => () => limpar(), []);

  const descartar = (d: FairDraw | null) => {
    if (d) adminApi("descartarGiro", { drawId: d.id }).catch(() => {});
  };

  const confirmar = async () => {
    if (!giro || ocupado) return;
    setOcupado(true);
    try {
      await adminApi("confirmarGanhador", { drawId: giro.id });
      onConfirmado();
    } catch (err) {
      popup.erro(err, "Não foi possível salvar o ganhador");
    }
    setOcupado(false);
  };

  const cancelar = () => {
    limpar();
    descartar(giro);
    onFechar();
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      {fase === "contagem" ? (
        esperando ? (
          <p className="font-display font-black uppercase text-3xl text-vermelho animate-pulse">Gerando o número público...</p>
        ) : (
          <span key={numero} className="font-display font-black text-[11rem] leading-none text-white animate-contagem drop-shadow-[0_0_40px_rgba(227,16,31,.9)]">
            {numero}
          </span>
        )
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center">
          <h2 className={`font-display font-black uppercase text-5xl mb-10 ${fase === "resultado" ? "" : "animate-pulse"}`}>
            {fase === "resultado" ? "Temos um ganhador" : "Sorteando..."}
          </h2>

          <div className="relative w-full h-44 bg-carvao border-y-4 border-sangue overflow-hidden flex items-center">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-vermelho z-10 -translate-x-1/2 shadow-[0_0_15px_rgba(227,16,31,1)]" />
            <div ref={faixaRef} className="flex gap-3 w-full will-change-transform" style={{ paddingLeft: `calc(50% - ${ITEM_W / 2}px)` }}>
              {itens.map(({ nome, foto }, i) => (
                <div key={i} className="w-[200px] h-[124px] shrink-0 bg-preto border border-grafite corte-sm flex flex-col items-center justify-center gap-2 px-3">
                  <Foto src={foto} nome={nome} tamanho="w-14 h-14 text-2xl" />
                  <span className="font-display font-black text-2xl uppercase truncate max-w-full leading-none">{nome}</span>
                </div>
              ))}
            </div>
          </div>

          {fase === "girando" && (
            <div className="mt-10 flex items-center gap-3">
              <button onClick={cancelar} className="btn btn-cinza"><X className="w-4 h-4" /> Cancelar sorteio</button>
              <button onClick={() => sons.setEnabled(!sons.enabled)} title={sons.enabled ? "Desligar som" : "Ligar som"} className="btn btn-cinza !px-4">
                {sons.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          )}

          {fase === "resultado" && giro && (
            <div className="mt-10 bg-carvao corte w-full max-w-md p-8 text-center relative border-t-4 border-vermelho animate-surge">
              <button onClick={cancelar} title="Fechar (o giro fica como descartado)" className="absolute top-4 right-4 text-cinza hover:text-osso"><X className="w-5 h-5" /></button>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <Foto src={fotos[giro.winner_label ?? ""] ?? null} nome={giro.winner_label ?? ""} tamanho="w-24 h-24 ring-4 ring-vermelho text-5xl" />
                <Trophy className="absolute -bottom-1 -right-1 w-9 h-9 p-1.5 bg-vermelho text-white rounded-full" />
              </div>
              <p className="font-display font-black uppercase text-5xl leading-none break-all">{giro.winner_label}</p>
              <p className="text-cinza mt-2 mb-2">Ganhador de {sorteio.titulo}</p>
              {resposta !== undefined && (
                <div className={`text-left px-4 py-3 mb-4 ${resposta ? "bg-sangue/40" : "bg-preto"}`}>
                  {resposta ? (
                    <><b className="block text-sm text-cinza">Respondeu no chat</b><span className="break-words">{resposta}</span></>
                  ) : (
                    <span className="text-cinza animate-pulse">Esperando {giro.winner_label} responder no chat...</span>
                  )}
                </div>
              )}
              <a href={`/provably-fair?id=${giro.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mb-6 font-bold text-sm border-b border-vermelho">
                <ShieldCheck className="w-4 h-4" /> Ver prova do sorteio
              </a>
              <div className="flex gap-2">
                <button onClick={confirmar} disabled={ocupado} className="btn btn-vermelho flex-1 !px-3 !text-base"><Trophy className="w-4 h-4" /> Confirmar</button>
                <button
                  onClick={() => {
                    descartar(giro);
                    comecar();
                  }}
                  disabled={ocupado}
                  className="btn btn-cinza flex-1 !px-3 !text-base"
                >
                  <RotateCcw className="w-4 h-4" /> Sortear de novo
                </button>
              </div>
              <p className="mt-4 text-sm text-cinza">Confirme quando o ganhador responder. &quot;Sortear de novo&quot; fica registrado como descartado.</p>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
