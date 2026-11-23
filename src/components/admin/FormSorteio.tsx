"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, ImageUp, Loader2, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { enviarImagemPremio } from "@/lib/upload";
import { usePopup } from "@/components/Popup";
import type { Sorteio, TipoSorteio } from "@/lib/sorteios";

// datetime-local trabalha no horário do navegador, sem fuso
const paraCampoData = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function FormSorteio({ sorteio, onFechar, onSalvo }: {
  sorteio: Sorteio | null; // null = novo
  onFechar: () => void;
  onSalvo: (s: Sorteio) => void;
}) {
  const popup = usePopup();
  const [tipo, setTipo] = useState<TipoSorteio>(sorteio?.tipo ?? "ticket");
  const [titulo, setTitulo] = useState(sorteio?.titulo ?? "");
  const [descricao, setDescricao] = useState(sorteio?.descricao ?? "");
  const [valor, setValor] = useState(sorteio?.valor != null ? String(sorteio.valor) : "");
  const [fechaEm, setFechaEm] = useState(paraCampoData(sorteio?.fecha_em ?? null));
  const [imagem, setImagem] = useState(sorteio?.imagem_url ?? "");
  const [canal, setCanal] = useState(sorteio?.canal ?? "soares");
  const [comando, setComando] = useState(sorteio?.comando ?? "!sorteio");
  const [t1, setT1] = useState(String(sorteio?.chance_t1 ?? 2));
  const [t2, setT2] = useState(String(sorteio?.chance_t2 ?? 3));
  const [t3, setT3] = useState(String(sorteio?.chance_t3 ?? 5));
  const [subindo, setSubindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const trava = useRef(false);

  const subirImagem = async (file: File | undefined) => {
    if (!file) return;
    setSubindo(true);
    try {
      setImagem(await enviarImagemPremio(file));
    } catch (err) {
      popup.erro(err);
    }
    setSubindo(false);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      const { sorteio: salvo } = await adminApi<{ sorteio: Sorteio }>("salvarSorteio", {
        id: sorteio?.id,
        tipo,
        titulo,
        descricao,
        valor,
        imagem_url: imagem,
        status: sorteio?.status ?? "aberto",
        fecha_em: fechaEm ? new Date(fechaEm).toISOString() : null,
        canal,
        comando,
        chance_t1: t1,
        chance_t2: t2,
        chance_t3: t3,
      });
      onSalvo(salvo);
    } catch (err) {
      popup.erro(err, "Não foi possível salvar");
    }
    trava.current = false;
    setSalvando(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex overflow-y-auto p-4" onClick={() => !salvando && onFechar()}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="m-auto w-full max-w-2xl bg-carvao corte p-6 relative animate-surge flex flex-col gap-4">
        <button type="button" onClick={onFechar} className="absolute right-3 top-3 w-10 h-10 grid place-items-center text-cinza hover:text-osso" aria-label="Fechar"><X /></button>
        <h2 className="font-display font-black uppercase text-[40px] leading-none">{sorteio ? "Editar sorteio" : "Novo sorteio"}</h2>

        {!sorteio && (
          <fieldset>
            <legend className="font-semibold mb-2">Como as pessoas entram</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {([
                ["ticket", "Print de depósito", "Chances pelas coins depositadas com o código"],
                ["chat", "Chat da Twitch", "Quem digitar o comando no chat ao vivo"],
              ] as const).map(([v, nome, desc]) => (
                <label key={v} className={`cursor-pointer p-3 border ${tipo === v ? "border-vermelho bg-sangue/30" : "border-grafite hover:border-grafite-2"}`}>
                  <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="sr-only" />
                  <b className="block">{nome}</b>
                  <span className="text-cinza text-sm">{desc}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid sm:grid-cols-[180px_1fr] gap-4">
          <label className="aspect-square fundo-premio grid place-items-center cursor-pointer border border-dashed border-grafite-2 hover:border-vermelho relative overflow-hidden">
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => subirImagem(e.target.files?.[0])} />
            {subindo ? (
              <Loader2 className="w-8 h-8 animate-spin text-vermelho" />
            ) : imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagem} alt="Imagem do prêmio" className="w-[90%] h-[90%] object-contain" />
            ) : (
              <span className="text-center text-cinza text-sm px-2"><ImageUp className="mx-auto mb-1" />Imagem do prêmio</span>
            )}
          </label>
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="font-semibold block mb-1">Nome do prêmio</span>
              <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo" placeholder="AK-47 Neon Rider" maxLength={120} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-semibold block mb-1">Valor (R$)</span>
                <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className="campo" placeholder="1850" />
              </label>
              <label className="block">
                <span className="font-semibold block mb-1">Fecha em <span className="text-cinza font-normal">(opcional)</span></span>
                <input type="datetime-local" value={fechaEm} onChange={(e) => setFechaEm(e.target.value)} className="campo [color-scheme:dark]" />
              </label>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="font-semibold block mb-1">Detalhe <span className="text-cinza font-normal">(opcional)</span></span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="campo" placeholder="Factory New, com adesivo da Major" maxLength={600} />
        </label>

        {tipo === "chat" && (
          <div className="border-t border-grafite pt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-semibold block mb-1">Canal da Twitch</span>
                <input required value={canal} onChange={(e) => setCanal(e.target.value)} className="campo" placeholder="soares" />
              </label>
              <label className="block">
                <span className="font-semibold block mb-1">Comando no chat</span>
                <input required value={comando} onChange={(e) => setComando(e.target.value)} className="campo" placeholder="!sorteio" />
              </label>
            </div>
            <div>
              <span className="font-semibold block mb-1">Chances de quem é sub <span className="text-cinza font-normal">(quem não é sub tem 1)</span></span>
              <div className="grid grid-cols-3 gap-3">
                {([["Tier 1", t1, setT1], ["Tier 2", t2, setT2], ["Tier 3", t3, setT3]] as const).map(([rotulo, v, set]) => (
                  <label key={rotulo} className="block">
                    <span className="text-cinza text-sm">{rotulo}</span>
                    <input type="number" min={1} max={1000} value={v} onChange={(e) => set(e.target.value)} className="campo" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onFechar} className="btn btn-cinza">Cancelar</button>
          <button type="submit" disabled={salvando || subindo} className="btn btn-vermelho">
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />} {sorteio ? "Salvar" : "Criar sorteio"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
