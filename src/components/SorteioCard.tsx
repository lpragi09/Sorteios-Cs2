"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, MessageSquare } from "lucide-react";
import { formatarNumero, formatarReais, inscricoesAbertas, type SorteioPublico } from "@/lib/sorteios";

/** "2d 04h 17m" até a data, atualizando a cada 30s. */
export function useTempoRestante(ate: string | null) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ate) return;
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [ate]);
  if (!ate) return null;
  const ms = new Date(ate).getTime() - agora;
  if (ms <= 0) return "";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return d > 0 ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m` : `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function SorteioCard({ sorteio, onParticipar }: { sorteio: SorteioPublico; onParticipar: (s: SorteioPublico) => void }) {
  const restante = useTempoRestante(sorteio.fecha_em);
  const aberto = inscricoesAbertas(sorteio);
  const ultimo = sorteio.ganhadores[sorteio.ganhadores.length - 1];
  const chat = sorteio.tipo === "chat";

  return (
    <article className={`bg-carvao corte flex flex-col ${aberto ? "" : "opacity-90"}`}>
      <div className="relative aspect-[4/3] grid place-items-center fundo-premio overflow-hidden">
        {sorteio.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sorteio.imagem_url}
            alt={sorteio.titulo}
            loading="lazy"
            className={`w-[86%] h-[86%] object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,.7)] ${aberto ? "" : "grayscale opacity-60"}`}
          />
        ) : (
          <Gift className="w-20 h-20 text-grafite-2" aria-hidden />
        )}
        <span className={`absolute right-3.5 top-3.5 px-2.5 py-1 text-sm font-bold ${aberto ? "bg-vermelho text-white" : "bg-preto/80 text-cinza"}`}>
          {aberto ? (chat ? "Ao vivo no chat" : "Aberto") : "Encerrado"}
        </span>
        {sorteio.valor != null && (
          <span className={`absolute left-0 bottom-0 etiqueta pl-4 pr-6 pt-2 pb-1.5 font-display font-black text-[28px] leading-none text-white ${aberto ? "bg-vermelho" : "bg-grafite"}`}>
            {formatarReais(sorteio.valor)}
          </span>
        )}
      </div>

      <div className="p-5 pb-6 flex flex-col gap-3.5 flex-1">
        <h3 className="font-display font-black text-[34px] leading-[.95] uppercase break-words">{sorteio.titulo}</h3>
        {sorteio.descricao && <p className="text-cinza text-base -mt-1.5 line-clamp-2">{sorteio.descricao}</p>}

        <div className="flex gap-6 text-cinza text-[15px]">
          {chat ? (
            <div><strong className="block text-osso font-display font-black text-[26px] leading-none">{formatarNumero(sorteio.chat)}</strong>no chat</div>
          ) : (
            <>
              <div><strong className="block text-osso font-display font-black text-[26px] leading-none">{formatarNumero(sorteio.coins)}</strong>coins no pote</div>
              <div><strong className="block text-osso font-display font-black text-[26px] leading-none">{formatarNumero(sorteio.tickets)}</strong>tickets</div>
            </>
          )}
        </div>

        {aberto ? (
          restante ? <p className="font-bold text-vermelho tabular-nums">Fecha em {restante}</p> : chat ? <p className="font-bold text-vermelho">Digite {sorteio.comando} no chat</p> : null
        ) : ultimo ? (
          <p className="font-semibold text-cinza">Ganhador: <span className="text-osso">{ultimo.nome}</span></p>
        ) : null}

        <div className="mt-auto pt-1">
          {chat ? (
            <Link href={`/chat?id=${sorteio.id}`} className={`btn w-full ${aberto ? "btn-vermelho" : "btn-cinza"}`}>
              <MessageSquare className="w-5 h-5" /> {aberto ? "Ver quem entrou" : "Ver resultado"}
            </Link>
          ) : aberto ? (
            <button onClick={() => onParticipar(sorteio)} className="btn btn-vermelho w-full">Participar</button>
          ) : (
            <Link href={`/provably-fair?sorteio=${sorteio.id}`} className="btn btn-cinza w-full">Ver resultado</Link>
          )}
        </div>
      </div>
    </article>
  );
}
