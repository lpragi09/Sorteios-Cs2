"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

// Tudo que abre por cima da página (popups, roleta, formulários) usa "fixed inset-0"
const SOBREPOSTO = ".fixed.inset-0";

/**
 * Rolagem suave com inércia (Lenis), a mesma do site da BB Agency: a roda do mouse não "pula",
 * a página desliza e desacelera. No celular o toque continua nativo.
 * Com um popup aberto a página para, e o popup rola normal.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.08,
      wheelMultiplier: 1,
      prevent: (node) => !!node.closest?.(`${SOBREPOSTO}, [data-lenis-prevent]`),
    });
    window.__lenis = lenis;

    const sync = () => (document.querySelector(SOBREPOSTO) ? lenis.stop() : lenis.start());
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });

    // Links "/#sorteios" na própria página: a Lenis faz o caminho até a seção
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname) return;
      const alvo = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!alvo) return;
      e.preventDefault();
      e.stopPropagation();
      lenis.scrollTo(alvo, { duration: 1.4 }); // a Lenis já respeita o scroll-mt da seção
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      mo.disconnect();
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
  return null;
}
