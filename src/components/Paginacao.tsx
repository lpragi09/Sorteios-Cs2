"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const POR_PAGINA = 10;

/** Divide uma lista em páginas. Volta pra última página válida se a lista encolher. */
export function usePaginacao<T>(itens: T[], porPagina = POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(itens.length / porPagina));
  // Se a lista encolher (filtro, exclusão), mostra a última página válida
  const atual = Math.min(pagina, paginas);
  const itensPagina = useMemo(() => itens.slice((atual - 1) * porPagina, atual * porPagina), [itens, atual, porPagina]);
  return { pagina: atual, setPagina: (p: number) => setPagina(Math.min(Math.max(1, p), paginas)), paginas, itensPagina, total: itens.length, porPagina };
}

function numeros(pagina: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const de = Math.max(2, pagina - 1);
  const ate = Math.min(total - 1, pagina + 1);
  if (de > 2) out.push("…");
  for (let i = de; i <= ate; i++) out.push(i);
  if (ate < total - 1) out.push("…");
  out.push(total);
  return out;
}

export default function Paginacao({ pagina, paginas, total, porPagina, setPagina }: ReturnType<typeof usePaginacao<unknown>>) {
  if (paginas <= 1) return null;
  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(total, pagina * porPagina);
  const btn = "min-w-9 h-9 px-2 font-bold flex items-center justify-center transition-colors";
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      <p className="text-sm text-cinza">Mostrando {de}–{ate} de {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPagina(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior" className={`${btn} text-cinza hover:bg-grafite disabled:opacity-30`}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        {numeros(pagina, paginas).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-cinza">…</span>
          ) : (
            <button key={p} onClick={() => setPagina(p)} className={`${btn} ${p === pagina ? "bg-vermelho text-white" : "text-cinza hover:bg-grafite"}`}>{p}</button>
          )
        )}
        <button onClick={() => setPagina(pagina + 1)} disabled={pagina === paginas} aria-label="Próxima página" className={`${btn} text-cinza hover:bg-grafite disabled:opacity-30`}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
