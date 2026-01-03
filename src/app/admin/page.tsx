"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Users, Gift, CheckCircle, XCircle, Plus, X, Link as LinkIcon, Trash2, Coins, BarChart3, Trophy, Lock, Unlock, TrendingUp, Sparkles, Edit, Eye } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const ADMIN_EMAIL = "lpmragi@gmail.com";

  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [sorteioSelecionado, setSorteioSelecionado] = useState<any>(null);
  
  const [listaSorteios, setListaSorteios] = useState<any[]>([]);
  const [ticketsDoSorteio, setTicketsDoSorteio] = useState<any[]>([]);
  const [statsDetalhadas, setStatsDetalhadas] = useState<any>({});

  // Modais e Estados de Formulário
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalEditarSorteio, setModalEditarSorteio] = useState<any>(null);
  const [modalEditarTicket, setModalEditarTicket] = useState<any>(null);
  
  const [formNome, setFormNome] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formImgUrl, setFormImgUrl] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.email !== ADMIN_EMAIL) {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    carregarDadosCompletos();
  }, [status, session]);

  const carregarDadosCompletos = async () => {
    const { data: sorteios } = await supabase.from('sorteios').select('*').order('created_at', { ascending: false });
    if (!sorteios) return;
    setListaSorteios(sorteios);

    const statsTemp: any = {};
    for (const s of sorteios) {
        const { data: tickets } = await supabase.from('tickets').select('coins').eq('sorteio_id', s.id);
        statsTemp[s.id] = { entries: tickets?.length || 0, coins: tickets?.reduce((acc, t) => acc + Number(t.coins), 0) || 0 };
    }
    setStatsDetalhadas(statsTemp);
  };

  const abrirSorteio = async (sorteio: any) => {
    setSorteioSelecionado(sorteio);
    const { data: tickets } = await supabase.from('tickets').select('*').eq('sorteio_id', sorteio.id).order('created_at', { ascending: false });
    setTicketsDoSorteio(tickets || []);
  };

  const handleCriarSorteio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { error } = await supabase.from('sorteios').insert([{ nome: formNome, img: formImgUrl, valor: formValor, status: "Ativo" }]);
      if (error) throw error;
      setModalCriarAberto(false);
      setFormNome(""); setFormValor(""); setFormImgUrl("");
      carregarDadosCompletos();
    } catch (err: any) { alert(err.message); } finally { setSalvando(false); }
  };

  const handleUpdateSorteio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { error } = await supabase.from('sorteios').update({ nome: modalEditarSorteio.nome, valor: modalEditarSorteio.valor, img: modalEditarSorteio.img }).eq('id', modalEditarSorteio.id);
      if (error) throw error;
      setModalEditarSorteio(null);
      carregarDadosCompletos();
    } catch (err: any) { alert(err.message); } finally { setSalvando(false); }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { error } = await supabase.from('tickets').update({ csgobigId: modalEditarTicket.csgobigId, coins: modalEditarTicket.coins, instagram: modalEditarTicket.instagram }).eq('id', modalEditarTicket.id);
      if (error) throw error;
      setModalEditarTicket(null);
      if (sorteioSelecionado) abrirSorteio(sorteioSelecionado);
    } catch (err: any) { alert(err.message); } finally { setSalvando(false); }
  };

  const handleToggleStatus = async (e: any, id: string, statusAtual: string) => {
    e.stopPropagation();
    await supabase.from('sorteios').update({ status: statusAtual === "Ativo" ? "Finalizado" : "Ativo" }).eq('id', id);
    carregarDadosCompletos();
  };

  const handleDeletarSorteio = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Excluir permanentemente?")) {
        await supabase.from('sorteios').delete().eq('id', id);
        carregarDadosCompletos();
    }
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-2xl font-black flex items-center gap-2 text-yellow-500"><Shield /> PAINEL CONTROLE</h1>
            <div className="flex gap-2">
                <button onClick={() => {setAbaAtiva("dashboard"); setSorteioSelecionado(null)}} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-400"}`}>Geral</button>
                <button onClick={() => setAbaAtiva("sorteios")} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-400"}`}>Sorteios</button>
            </div>
        </div>

        {abaAtiva === "sorteios" && !sorteioSelecionado && (
            <div className="animate-in fade-in duration-500">
                <button onClick={() => setModalCriarAberto(true)} className="mb-8 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition"><Plus /> Novo Sorteio</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaSorteios.map((s) => (
                        <div key={s.id} onClick={() => abrirSorteio(s)} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 cursor-pointer hover:border-yellow-500 transition">
                            <img src={s.img} className="w-20 h-20 object-contain bg-black rounded-lg p-2" />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold">{s.nome}</h3>
                                <p className="text-slate-400 text-sm">R$ {s.valor}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setModalEditarSorteio(s); }} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500"><Edit size={18}/></button>
                                <button onClick={(e) => handleToggleStatus(e, s.id, s.status)} className="p-2 bg-slate-800 rounded-lg text-yellow-500 hover:bg-slate-700">{s.status === "Ativo" ? <Unlock size={18}/> : <Lock size={18}/>}</button>
                                <button onClick={(e) => handleDeletarSorteio(e, s.id)} className="p-2 bg-red-900/50 rounded-lg text-red-500 hover:bg-red-900"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {sorteioSelecionado && (
            <div className="animate-in slide-in-from-right-4 duration-500">
                <button onClick={() => setSorteioSelecionado(null)} className="text-slate-400 mb-4 flex items-center gap-1 hover:text-white">{"← Voltar"}</button>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-6 bg-slate-900/50 flex justify-between items-center border-b border-slate-800">
                        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="text-yellow-500"/> {sorteioSelecionado.nome}</h2>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[10px]">
                            <tr>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Big ID</th>
                                <th className="p-4">Coins</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {ticketsDoSorteio.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-800/30">
                                    <td className="p-4">
                                        <div className="font-bold text-blue-400">@{t.instagram}</div>
                                        <div className="text-[10px] text-slate-500">{t.email}</div>
                                    </td>
                                    <td className="p-4 font-mono">{t.csgobigId}</td>
                                    <td className="p-4 text-yellow-500 font-black">{t.coins}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => setModalEditarTicket(t)} className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-blue-400"><Edit size={16}/></button>
                                        {t.print && <a href={t.print} target="_blank" className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-green-400"><Eye size={16}/></a>}
                                        <button onClick={() => supabase.from('tickets').update({status:'Aprovado'}).eq('id',t.id).then(()=>abrirSorteio(sorteioSelecionado))} className="p-2 bg-green-600 rounded text-white"><CheckCircle size={16}/></button>
                                        <button onClick={() => supabase.from('tickets').update({status:'Rejeitado'}).eq('id',t.id).then(()=>abrirSorteio(sorteioSelecionado))} className="p-2 bg-red-600 rounded text-white"><XCircle size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL EDITAR SORTEIO */}
        {modalEditarSorteio && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800">
                    <h3 className="text-xl font-bold mb-6">EDITAR SORTEIO</h3>
                    <form onSubmit={handleUpdateSorteio} className="space-y-4">
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarSorteio.nome} onChange={e => setModalEditarSorteio({...modalEditarSorteio, nome: e.target.value})} />
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarSorteio.valor} onChange={e => setModalEditarSorteio({...modalEditarSorteio, valor: e.target.value})} />
                        <input type="url" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarSorteio.img} onChange={e => setModalEditarSorteio({...modalEditarSorteio, img: e.target.value})} />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setModalEditarSorteio(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold">Cancelar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black">SALVAR</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL EDITAR TICKET */}
        {modalEditarTicket && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800">
                    <h3 className="text-xl font-bold mb-6 text-yellow-500 font-mono tracking-tighter">EDITAR PARTICIPANTE</h3>
                    <form onSubmit={handleUpdateTicket} className="space-y-4">
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Instagram</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.instagram} onChange={e => setModalEditarTicket({...modalEditarTicket, instagram: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Big ID</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.csgobigId} onChange={e => setModalEditarTicket({...modalEditarTicket, csgobigId: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Coins Depositados</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.coins} onChange={e => setModalEditarTicket({...modalEditarTicket, coins: e.target.value})} /></div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditarTicket(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold text-xs uppercase">Fechar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black text-xs uppercase">Atualizar Dados</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL CRIAR (IDÊNTICO AO ANTERIOR) */}
        {modalCriarAberto && (
            <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800">
                    <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black uppercase">Novo Sorteio</h3><button onClick={() => setModalCriarAberto(false)}><X/></button></div>
                    <form onSubmit={handleCriarSorteio} className="space-y-4">
                        <input type="text" required placeholder="Nome da Skin" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none focus:border-yellow-500" />
                        <input type="text" required placeholder="Valor" value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none focus:border-yellow-500" />
                        <input type="url" required placeholder="Link Direto da Imagem" value={formImgUrl} onChange={e => setFormImgUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none focus:border-yellow-500" />
                        <button type="submit" disabled={salvando} className="w-full bg-yellow-500 py-4 rounded-xl font-black text-black uppercase hover:bg-yellow-400 transition">{salvando ? "Salvando..." : "Criar Sorteio"}</button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}