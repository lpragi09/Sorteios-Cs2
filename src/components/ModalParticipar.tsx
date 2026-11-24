"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { ImageUp, Loader2, X } from "lucide-react";
import { usePopup } from "@/components/Popup";
import { enviarPrint } from "@/lib/upload";
import { CODIGO, formatarReais, type Parceiro, type SorteioPublico } from "@/lib/sorteios";
import { markDataChanged } from "@/lib/freshData";

const MAX_ARQUIVO = 15 * 1024 * 1024; // o navegador comprime antes de enviar

export default function ModalParticipar({ sorteio, parceiros, onFechar }: { sorteio: SorteioPublico; parceiros: Parceiro[]; onFechar: () => void }) {
  const { status } = useSession();
  const popup = usePopup();
  const router = useRouter();
  const [casa, setCasa] = useState(parceiros[0]?.id ?? "");
  const [casaId, setCasaId] = useState("");
  const [coins, setCoins] = useState("");
  const [instagram, setInstagram] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const trava = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !enviando && onFechar();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [enviando, onFechar]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const escolherArquivo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void popup.alerta("Envie uma imagem (print da tela).", { tipo: "aviso" });
    if (file.size > MAX_ARQUIVO) return void popup.alerta("Envie um print menor que 15 MB.", { tipo: "aviso", titulo: "Imagem muito pesada" });
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trava.current) return;
    if (!arquivo) return void popup.alerta("Anexe o print do depósito.", { tipo: "aviso" });
    trava.current = true;
    setEnviando(true);
    try {
      const printPath = await enviarPrint(sorteio.id, arquivo);
      const res = await fetch("/api/participar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "enviar", sorteioId: sorteio.id, casa, casaId, coins, instagram, printPath }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar o ticket.");
      markDataChanged();
      onFechar();
      const ver = await popup.confirmar("Seu ticket está esperando a equipe conferir o print. Quando for aprovado, ele entra no sorteio.", {
        tipo: "sucesso",
        titulo: "Ticket enviado",
        textoOk: "Ver meus tickets",
        textoCancelar: "Fechar",
      });
      if (ver) router.push("/meus-tickets");
    } catch (err) {
      popup.erro(err);
    } finally {
      trava.current = false;
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex overflow-y-auto p-4" onClick={() => !enviando && onFechar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="participar-titulo"
        className="m-auto w-full max-w-lg bg-carvao corte relative animate-surge"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onFechar} disabled={enviando} className="absolute right-3 top-3 w-10 h-10 grid place-items-center text-cinza hover:text-osso" aria-label="Fechar">
          <X />
        </button>

        <div className="p-6 pb-0">
          <p className="text-cinza font-semibold">Participar do sorteio</p>
          <h2 id="participar-titulo" className="font-display font-black text-[40px] leading-[.95] uppercase pr-10">{sorteio.titulo}</h2>
          {sorteio.valor != null && <p className="text-vermelho font-bold mt-1">{formatarReais(sorteio.valor)}</p>}
        </div>

        {status !== "authenticated" ? (
          <div className="p-6">
            <p className="text-cinza mb-5">Entre com a sua conta Google pra mandar o ticket e acompanhar a aprovação.</p>
            <button onClick={() => signIn("google")} disabled={status === "loading"} className="btn btn-vermelho w-full">Entrar com Google</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="p-6 flex flex-col gap-4">
            <fieldset>
              <legend className="font-semibold mb-2">Onde você depositou com o código {CODIGO}?</legend>
              <div className="grid grid-cols-2 gap-2">
                {parceiros.map((c) => (
                  <label key={c.id} className={`cursor-pointer text-center py-3 font-bold border ${casa === c.id ? "border-vermelho bg-sangue/30" : "border-grafite hover:border-grafite-2"}`}>
                    <input type="radio" name="casa" value={c.id} checked={casa === c.id} onChange={() => setCasa(c.id)} className="sr-only" />
                    {c.nome}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-semibold block mb-1.5">Seu ID na casa</span>
                <input required value={casaId} onChange={(e) => setCasaId(e.target.value)} className="campo" placeholder="Ex.: 482913" autoComplete="off" />
              </label>
              <label className="block">
                <span className="font-semibold block mb-1.5">Coins depositadas</span>
                <input required type="number" inputMode="numeric" min={1} step={1} value={coins} onChange={(e) => setCoins(e.target.value)} className="campo" placeholder="Ex.: 500" />
              </label>
            </div>

            <label className="block">
              <span className="font-semibold block mb-1.5">Seu Instagram</span>
              <input required value={instagram} onChange={(e) => setInstagram(e.target.value)} className="campo" placeholder="@seuinsta" autoComplete="off" />
              <span className="text-cinza text-sm">É por ele que o Soares fala com quem ganhar.</span>
            </label>

            <div>
              <span className="font-semibold block mb-1.5">Print do depósito</span>
              <label
                className="flex items-center gap-4 border border-dashed border-grafite-2 hover:border-vermelho p-3 cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  escolherArquivo(e.dataTransfer.files[0]);
                }}
              >
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Print escolhido" className="w-16 h-16 object-cover" />
                ) : (
                  <span className="w-16 h-16 grid place-items-center bg-preto"><ImageUp className="text-cinza" /></span>
                )}
                <span className="text-[15px]">
                  <b className="block">{arquivo ? "Print anexado" : "Anexar print"}</b>
                  <span className="text-cinza">{arquivo ? "Toque pra trocar" : "Precisa mostrar seu ID e as coins depositadas"}</span>
                </span>
              </label>
            </div>

            <button type="submit" disabled={enviando} className="btn btn-vermelho w-full mt-1">
              {enviando ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando</> : "Enviar ticket"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
