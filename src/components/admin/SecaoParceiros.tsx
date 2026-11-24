"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, ImageUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { enviarImagemPremio } from "@/lib/upload";
import { usePopup } from "@/components/Popup";
import type { Parceiro } from "@/lib/sorteios";

type Form = Parceiro & { novo: boolean };

const vazio = (ordem: number): Form => ({ id: "", nome: "", link: "https://", destaque: "", imagem_url: "", ordem, ativo: true, novo: true });

export default function SecaoParceiros() {
  const popup = usePopup();
  const [lista, setLista] = useState<Parceiro[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLista((await adminApi<{ parceiros: Parceiro[] }>("listarParceiros")).parceiros);
    } catch (err) {
      popup.erro(err);
    }
  }, [popup]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- busca de dados: o state só muda depois da resposta
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || salvando) return;
    setSalvando(true);
    try {
      await adminApi("salvarParceiro", { ...form });
      setForm(null);
      carregar();
    } catch (err) {
      popup.erro(err, "Não foi possível salvar");
    }
    setSalvando(false);
  };

  const alternarAtivo = async (p: Parceiro) => {
    try {
      await adminApi("salvarParceiro", { ...p, ativo: !p.ativo, novo: false });
      carregar();
    } catch (err) {
      popup.erro(err);
    }
  };

  const excluir = async (p: Parceiro) => {
    if (!(await popup.confirmar(`${p.nome} sai do site e do formulário de ticket. Os tickets antigos dessa casa continuam salvos. Pra só esconder, use o botão de olho.`, { titulo: "Excluir parceiro?", textoOk: "Excluir" }))) return;
    try {
      await adminApi("excluirParceiro", { id: p.id });
      carregar();
    } catch (err) {
      popup.erro(err);
    }
  };

  const subirImagem = async (file: File | undefined) => {
    if (!file || !form) return;
    setSubindo(true);
    try {
      const url = await enviarImagemPremio(file);
      setForm((f) => (f ? { ...f, imagem_url: url } : f));
    } catch (err) {
      popup.erro(err);
    }
    setSubindo(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-cinza max-w-[60ch]">As casas aparecem na home e são as opções no formulário do ticket. Imagem em pé (3:4), por exemplo 1080 × 1440 px.</p>
        <button onClick={() => setForm(vazio((lista?.length ?? 0) + 1))} className="btn btn-vermelho !py-2.5"><Plus className="w-5 h-5" /> Novo parceiro</button>
      </div>

      {!lista ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-vermelho" /></div>
      ) : lista.length === 0 ? (
        <p className="text-cinza bg-carvao p-6">Nenhum parceiro cadastrado. Sem parceiro ativo, ninguém consegue mandar ticket.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((p) => (
            <li key={p.id} className={`bg-carvao corte flex flex-col ${p.ativo ? "" : "opacity-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imagem_url || "/hero-poster.webp"} alt="" className="w-full aspect-[3/4] object-cover" />
              <div className="p-4 flex-1 flex flex-col gap-1">
                <p className="font-bold text-lg">{p.nome} {!p.ativo && <span className="text-cinza text-sm font-semibold">(escondido)</span>}</p>
                {p.destaque && <p className="text-vermelho text-[15px]">{p.destaque}</p>}
                <a href={p.link} target="_blank" rel="noreferrer" className="text-cinza text-sm truncate hover:text-osso inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5 shrink-0" />{p.link}</a>
                <p className="text-cinza text-sm">Identificador: <span className="font-mono">{p.id}</span>, ordem {p.ordem}</p>
                <div className="flex gap-1 mt-3">
                  <button onClick={() => setForm({ ...p, destaque: p.destaque ?? "", imagem_url: p.imagem_url ?? "", novo: false })} className="h-10 px-3 bg-grafite hover:bg-grafite-2 font-bold flex items-center gap-1.5"><Pencil className="w-4 h-4" /> Editar</button>
                  <button onClick={() => alternarAtivo(p)} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title={p.ativo ? "Esconder do site" : "Mostrar no site"} aria-label={p.ativo ? "Esconder do site" : "Mostrar no site"}>
                    {p.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => excluir(p)} className="w-10 h-10 grid place-items-center bg-grafite hover:bg-grafite-2" title="Excluir" aria-label="Excluir"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex overflow-y-auto p-4" onClick={() => !salvando && setForm(null)}>
          <form onSubmit={salvar} onClick={(e) => e.stopPropagation()} className="m-auto w-full max-w-xl bg-carvao corte p-6 relative animate-surge flex flex-col gap-4">
            <button type="button" onClick={() => setForm(null)} className="absolute right-3 top-3 w-10 h-10 grid place-items-center text-cinza hover:text-osso" aria-label="Fechar"><X /></button>
            <h2 className="font-display font-black uppercase text-[40px] leading-none">{form.novo ? "Novo parceiro" : `Editar ${form.nome}`}</h2>
            <div className="grid sm:grid-cols-[150px_1fr] gap-4">
              <label className="aspect-[3/4] bg-preto grid place-items-center cursor-pointer border border-dashed border-grafite-2 hover:border-vermelho overflow-hidden">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => subirImagem(e.target.files?.[0])} />
                {subindo ? <Loader2 className="w-7 h-7 animate-spin text-vermelho" /> : form.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imagem_url} alt="Arte do parceiro" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-center text-cinza text-sm px-2"><ImageUp className="mx-auto mb-1" />Arte do parceiro</span>
                )}
              </label>
              <div className="flex flex-col gap-3">
                <label><span className="font-semibold block mb-1">Nome</span><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="campo" placeholder="DASTSKIN" maxLength={60} /></label>
                <label>
                  <span className="font-semibold block mb-1">Identificador</span>
                  <input required disabled={!form.novo} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="campo disabled:opacity-60" placeholder="dastskin" maxLength={30} />
                  <span className="text-cinza text-sm">{form.novo ? "Curto e sem espaço. Não dá pra mudar depois." : "Não dá pra mudar (os tickets usam ele)."}</span>
                </label>
              </div>
            </div>
            <label><span className="font-semibold block mb-1">Link com o código do Soares</span><input required type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="campo" placeholder="https://..." /></label>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <label><span className="font-semibold block mb-1">Destaque <span className="text-cinza font-normal">(opcional)</span></span><input value={form.destaque ?? ""} onChange={(e) => setForm({ ...form, destaque: e.target.value })} className="campo" placeholder="25% de bônus no depósito" maxLength={80} /></label>
              <label><span className="font-semibold block mb-1">Ordem</span><input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} className="campo" /></label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setForm(null)} className="btn btn-cinza">Cancelar</button>
              <button type="submit" disabled={salvando || subindo} className="btn btn-vermelho">{salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
