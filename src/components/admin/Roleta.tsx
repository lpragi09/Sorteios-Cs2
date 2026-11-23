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
  const [itens, setItens] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const faixaRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const giroId = useRef(0);
  const pedido = useRef<Promise<FairDraw> | null>(null);
  const sons = useSounds();
  const popup = usePopup();

  const limpar = () => {
    giroId.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const girar = (d: FairDraw) => {
    const nomes = d.entries.map((e) => e.label);
    const faixa = Array.from({ length: TAMANHO }, () => nomes[Math.floor(Math.random() * nomes.length)]);
    faixa[INDICE_GANHADOR] = d.winner_label ?? "";
    setItens(faixa);
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

  // 3·2·1 enquanto o servidor congela a lista e espera o número público
  const comecar = () => {
    limpar();
    sons.unlock();
    setGiro(null);
    setEsperando(false);
    setFase("contagem");
    onSorteado?.(null);
    const p = adminApi<{ draw: FairDraw }>("sortear", { sorteioId: sorteio.id }).then((r) => r.draw);
    p.catch(() => {});
    pedido.current = p;
    [3, 2, 1].forEach((n, i) =>
      timers.current.push(setTimeout(() => {
        setNumero(n);
        sons.tick(n === 1 ? 0.9 : n === 2 ? 0.5 : 0.15);
      }, i * CONTAGEM_MS))
    );
    timers.current.push(
      setTimeout(() => {
        setEsperando(true);
        p.then(girar, (err) => {
          popup.erro(err, "Não foi possível sortear");
          onFechar();
        });
      }, 3 * CONTAGEM_MS)
    );
  };

  const iniciado = useRef(false); // o React em desenvolvimento roda o efeito duas vezes
  useEffect(() => {
    if (!iniciado.current) {
      iniciado.current = true;
      comecar();
    }
    return limpar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <div className="relative w-full h-40 bg-carvao border-y-4 border-sangue overflow-hidden flex items-center">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-vermelho z-10 -translate-x-1/2 shadow-[0_0_15px_rgba(227,16,31,1)]" />
            <div ref={faixaRef} className="flex gap-3 w-full will-change-transform" style={{ paddingLeft: `calc(50% - ${ITEM_W / 2}px)` }}>
              {itens.map((nome, i) => (
                <div key={i} className="w-[200px] h-[112px] shrink-0 bg-preto border border-grafite corte-sm grid place-items-center px-3">
                  <span className="font-display font-black text-3xl uppercase truncate max-w-full">{nome}</span>
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
              <Trophy className="w-12 h-12 text-vermelho mx-auto mb-3" />
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
