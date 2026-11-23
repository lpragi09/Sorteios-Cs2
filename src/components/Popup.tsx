"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, HelpCircle, Info, XCircle } from "lucide-react";

// Popups do site no lugar do alert()/confirm() do navegador.
// Uso: const popup = usePopup(); if (await popup.confirmar("...")) { ... }

type Tipo = "sucesso" | "erro" | "aviso" | "info" | "pergunta";

type Opcoes = {
  titulo?: string;
  tipo?: Tipo;
  textoOk?: string;
  textoCancelar?: string;
  perigo?: boolean; // ação que apaga algo: botão de confirmar com borda de alerta
};

type PopupAtual = Opcoes & { mensagem: React.ReactNode; comCancelar: boolean; resolver: (ok: boolean) => void };

type PopupApi = {
  alerta: (mensagem: React.ReactNode, opcoes?: Opcoes) => Promise<void>;
  confirmar: (mensagem: React.ReactNode, opcoes?: Opcoes) => Promise<boolean>;
  /** Mostra a mensagem de um erro capturado. */
  erro: (err: unknown, titulo?: string) => Promise<void>;
};

const PopupContext = createContext<PopupApi | null>(null);

const ESTILO: Record<Tipo, { Icone: typeof Info; titulo: string }> = {
  sucesso: { Icone: CheckCircle2, titulo: "Pronto" },
  erro: { Icone: XCircle, titulo: "Não deu certo" },
  aviso: { Icone: AlertTriangle, titulo: "Atenção" },
  info: { Icone: Info, titulo: "Aviso" },
  pergunta: { Icone: HelpCircle, titulo: "Confirmar" },
};

export function PopupProvider({ children }: { children: React.ReactNode }) {
  // Só abre por ação no navegador, então `document` já existe quando há popup
  const [atual, setAtual] = useState<PopupAtual | null>(null);
  const fila = useRef<PopupAtual[]>([]);

  const abrir = useCallback((p: PopupAtual) => {
    setAtual((cur) => {
      if (cur) {
        fila.current.push(p);
        return cur;
      }
      return p;
    });
  }, []);

  const fechar = useCallback((ok: boolean) => {
    setAtual((cur) => {
      cur?.resolver(ok);
      return fila.current.shift() ?? null;
    });
  }, []);

  const [api] = useState<PopupApi>(() => ({
    alerta: (mensagem, opcoes) =>
      new Promise<void>((resolve) => abrir({ tipo: "info", ...opcoes, mensagem, comCancelar: false, resolver: () => resolve() })),
    confirmar: (mensagem, opcoes) =>
      new Promise<boolean>((resolve) => abrir({ tipo: "pergunta", ...opcoes, mensagem, comCancelar: true, resolver: resolve })),
    erro: (err, titulo) =>
      new Promise<void>((resolve) =>
        abrir({ tipo: "erro", titulo, mensagem: err instanceof Error ? err.message : String(err), comCancelar: false, resolver: () => resolve() })
      ),
  }));

  useEffect(() => {
    if (!atual) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [atual, fechar]);

  const estilo = ESTILO[atual?.tipo ?? "info"];
  const destaque = atual?.tipo === "sucesso" ? "text-osso" : "text-vermelho";

  return (
    <PopupContext.Provider value={api}>
      {children}
      {atual &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => fechar(false)}>
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="popup-titulo"
              className="w-full max-w-sm bg-carvao corte p-6 border-l-4 border-vermelho animate-surge"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <estilo.Icone className={`w-7 h-7 shrink-0 ${destaque}`} />
                <div className="min-w-0">
                  <h3 id="popup-titulo" className="font-display font-black text-[28px] leading-none uppercase">
                    {atual.titulo ?? estilo.titulo}
                  </h3>
                  <div className="text-cinza mt-2 whitespace-pre-line break-words">{atual.mensagem}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-6 justify-end">
                {atual.comCancelar && (
                  <button onClick={() => fechar(false)} className="btn btn-cinza !py-2.5 !px-5 !text-base">
                    {atual.textoCancelar ?? "Cancelar"}
                  </button>
                )}
                <button autoFocus onClick={() => fechar(true)} className="btn btn-vermelho !py-2.5 !px-5 !text-base">
                  {atual.textoOk ?? "OK"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error("usePopup precisa estar dentro do <PopupProvider>");
  return ctx;
}
