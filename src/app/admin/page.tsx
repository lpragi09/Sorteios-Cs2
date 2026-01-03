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
  
  // Estados da Visão Geral
  const [totalEntradasAtivas, setTotalEntradasAtivas] = useState(0);
  const [totalCoinsAtivos, setTotalCoinsAtivos] = useState(0);
  const [totalSorteiosAtivos, setTotalSorteiosAtivos] = useState(0);
  const [statsDetalhadas, setStatsDetalhadas] = useState<any>({});

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
    const { data: sorteios, error: errS } = await supabase.from('sorteios').select('*').order('created_at', { ascending: false });
    if (errS || !sorteios) return;
    setListaSorteios(sorteios);

    let somaE = 0;
    let somaC = 0;
    let contaA = 0;
    const statsTemp: any = {};

    for (const s of sorteios) {
        // Busca TODOS os tickets deste sorteio (sem filtro de status para as stats)
        const { data: tickets } = await supabase.from('tickets').select('coins').eq('sorteio_id', s.id);
        const totalT = tickets?.length || 0;
        const totalC = tickets?.reduce((acc, t) => acc + Number(t.coins), 0) || 0;
        
        statsTemp[s.id] = { entries: totalT, coins: totalC };

        if (s.status === "Ativo") {
            somaE += totalT;
            somaC += totalC;
            contaA++;
        }
    }

    setTotalEntradasAtivas(somaE);
    setTotalCoinsAtivos(somaC);
    setTotalSorteiosAtivos(contaA);
    setStatsDetalhadas(statsTemp);
  };

  const abrirSorteio = async (sorteio: any) => {
    setSorteioSelecionado(sorteio);
    // Busca os tickets e garante que atualiza a lista
    const { data: tickets, error } = await supabase.from('tickets').select('*').eq('sorteio_id', sorteio.id).order('created_at', { ascending: false });
    if (error) console.error(error);
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
      carregarDadosCompletos(); // Atualiza contagem global
    } catch (err: any) { alert(err.message); } finally { setSalvando(false); }
  };

  const handleToggleStatus = async (e: any, id: string, statusAtual: string) => {
    e.stopPropagation();
    const novoStatus = statusAtual === "Ativo" ? "Finalizado" : "Ativo";
    await supabase.from('sorteios').update({ status: novoStatus }).eq('id', id);
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
            <h1 className="text-2xl font-black flex items-center gap-2 text-yellow-500"><Shield /> PAINEL ADMIN</h1>
            <div className="flex gap-2">
                <button onClick={() => {setAbaAtiva("dashboard"); setSorteioSelecionado(null)}} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-slate-800 text-slate-400"}`}>Visão Geral</button>
                <button onClick={() => setAbaAtiva("sorteios")} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-slate-800 text-slate-400"}`}>Sorteios</button>
            </div>
        </div>

        {abaAtiva === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                        <div className="bg-yellow-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-yellow-500"><Gift /></div>
                        <div><p className="text-slate-400 text-xs font-bold uppercase">Sorteios Ativos</p><p className="text-3xl font-black">{totalSorteiosAtivos}</p></div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                        <div className="bg-blue-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-blue-500"><Users /></div>
                        <div><p className="text-slate-400 text-xs font-bold uppercase">Entradas Ativas</p><p className="text-3xl font-black">{totalEntradasAtivas}</p></div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
                        <div className="bg-green-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-green-500"><Coins /></div>
                        <div><p className="text-slate-400 text-xs font-bold uppercase">Pool Ativo (Coins)</p><p className="text-3xl font-black text-green-400">{totalCoinsAtivos}</p></div>
                    </div>
                </div>

                {/* Lista Detalhada Pedida */}
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-3"><TrendingUp size={20}/> Detalhamento por Sorteio</h2>
                    <div className="space-y-3">
                        {listaSorteios.map((s) => (
                            <div key={s.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-800/50 transition gap-4">
                                <div className="flex items-center gap-4">
                                    <img src={s.img} alt="" className="w-12 h-12 object-contain bg-slate-950 rounded p-1" />
                                    <div>
                                        <h3 className="font-bold text-white">{s.nome}</h3>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${s.status === 'Ativo' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-8 text-right justify-between md:justify-end">
                                    <div><p className="text-[10px] text-slate-400 uppercase">Entradas</p><p className="text-xl font-bold">{statsDetalhadas[s.id]?.entries || 0}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase">Coins</p><p className="text-xl font-bold text-yellow-500">{statsDetalhadas[s.id]?.coins || 0}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {abaAtiva === "sorteios" && !sorteioSelecionado && (
            <div className="animate-in fade-in duration-500">
                <button onClick={() => setModalCriarAberto(true)} className="mb-8 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-green-900/20"><Plus /> Novo Sorteio</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaSorteios.map((s) => (
                        <div key={s.id} onClick={() => abrirSorteio(s)} className={`bg-slate-900 p-6 rounded-2xl border flex items-center gap-4 cursor-pointer hover:border-yellow-500 transition relative ${s.status === 'Finalizado' ? 'border-red-900/50 opacity-80' : 'border-slate-800'}`}>
                            <img src={s.img} className="w-20 h-20 object-contain bg-black rounded-lg p-2" />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold">{s.nome}</h3>
                                <p className="text-slate-400 text-sm">R$ {s.valor}</p>
                                {s.status === "Finalizado" && <span className="text-red-500 font-bold text-[10px] uppercase border border-red-500 px-1 rounded">Cadeado Trancado</span>}
                            </div>
                            <div className="flex gap-2 z-10">
                                <button onClick={(e) => { e.stopPropagation(); setModalEditarSorteio(s); }} className="p-2.5 bg-blue-600 rounded-lg text-white hover:bg-blue-500 shadow-lg"><Edit size={18}/></button>
                                <button onClick={(e) => handleToggleStatus(e, s.id, s.status)} className={`p-2.5 rounded-lg shadow-lg transition ${s.status === "Ativo" ? "bg-slate-800 text-yellow-500" : "bg-red-600 text-white"}`}>
                                    {s.status === "Ativo" ? <Unlock size={18}/> : <Lock size={18}/>}
                                </button>
                                <button onClick={(e) => handleDeletarSorteio(e, s.id)} className="p-2.5 bg-red-900/50 rounded-lg text-red-500 hover:bg-red-600 hover:text-white"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {sorteioSelecionado && (
            <div className="animate-in slide-in-from-right-4 duration-500">
                <button onClick={() => { setSorteioSelecionado(null); carregarDadosCompletos(); }} className="text-slate-400 mb-4 flex items-center gap-1 hover:text-white">{"← Voltar"}</button>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="p-6 bg-slate-900/50 flex justify-between items-center border-b border-slate-800">
                        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="text-yellow-500"/> Entradas: {sorteioSelecionado.nome}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-500 uppercase text-[10px]">
                                <tr>
                                    <th className="p-4">Usuário / Email</th>
                                    <th className="p-4">Big ID</th>
                                    <th className="p-4">Coins</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {ticketsDoSorteio.length === 0 ? (
                                    <tr><td colSpan={4} className="p-10 text-center text-slate-500">Nenhuma entrada encontrada para este sorteio.</td></tr>
                                ) : (
                                    ticketsDoSorteio.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-800/30 transition">
                                            <td className="p-4">
                                                <div className="font-bold text-blue-400">@{t.instagram}</div>
                                                <div className="text-[10px] text-slate-500">{t.email}</div>
                                            </td>
                                            <td className="p-4 font-mono text-white">{t.csgobigId}</td>
                                            <td className="p-4 text-yellow-500 font-black">{t.coins}</td>
                                            <td className="p-4 flex justify-center gap-2">
                                                <button onClick={() => setModalEditarTicket(t)} className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-blue-400 transition" title="Editar"><Edit size={16}/></button>
                                                {t.print && <a href={t.print} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-green-400 transition" title="Ver Comprovante"><Eye size={16}/></a>}
                                                <button onClick={() => supabase.from('tickets').update({status:'Aprovado'}).eq('id',t.id).then(()=>abrirSorteio(sorteioSelecionado))} className="p-2 bg-green-600 hover:bg-green-500 rounded text-white shadow-lg transition"><CheckCircle size={16}/></button>
                                                <button onClick={() => supabase.from('tickets').update({status:'Rejeitado'}).eq('id',t.id).then(()=>abrirSorteio(sorteioSelecionado))} className="p-2 bg-red-600 hover:bg-red-500 rounded text-white shadow-lg transition"><XCircle size={16}/></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDITAR SORTEIO */}
        {modalEditarSorteio && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Edit className="text-blue-500"/> EDITAR SORTEIO</h3>
                    <form onSubmit={handleUpdateSorteio} className="space-y-4">
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Nome da Skin</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mt-1" value={modalEditarSorteio.nome} onChange={e => setModalEditarSorteio({...modalEditarSorteio, nome: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Valor</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mt-1" value={modalEditarSorteio.valor} onChange={e => setModalEditarSorteio({...modalEditarSorteio, valor: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">URL da Imagem</label>
                        <input type="url" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mt-1" value={modalEditarSorteio.img} onChange={e => setModalEditarSorteio({...modalEditarSorteio, img: e.target.value})} /></div>
                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={() => setModalEditarSorteio(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black hover:bg-yellow-400 transition">SALVAR ALTERAÇÕES</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL EDITAR TICKET */}
        {modalEditarTicket && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-yellow-500">EDITAR DADOS DO USUÁRIO</h3>
                    <form onSubmit={handleUpdateTicket} className="space-y-4">
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Instagram</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.instagram} onChange={e => setModalEditarTicket({...modalEditarTicket, instagram: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">CSGOBIG ID</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.csgobigId} onChange={e => setModalEditarTicket({...modalEditarTicket, csgobigId: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Coins</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.coins} onChange={e => setModalEditarTicket({...modalEditarTicket, coins: e.target.value})} /></div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditarTicket(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold uppercase text-xs">Fechar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black text-xs uppercase">Atualizar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL CRIAR */}
        {modalCriarAberto && (
            <div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl relative">
                    <button onClick={() => setModalCriarAberto(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button>
                    <h3 className="text-2xl font-black uppercase mb-6">Novo Sorteio</h3>
                    <form onSubmit={handleCriarSorteio} className="space-y-4">
                        <input type="text" required placeholder="Nome da Skin" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none focus:border-yellow-500" />
                        <input type="text" required placeholder="Valor de Mercado" value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none focus:border-yellow-500" />
                        <input type="url" required placeholder="Link da Imagem (Imgur)" value={formImgUrl} onChange={e => setFormImgUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none focus:border-yellow-500" />
                        <button type="submit" disabled={salvando} className="w-full bg-yellow-500 py-5 rounded-2xl font-black text-black uppercase hover:bg-yellow-400 transition shadow-lg">{salvando ? "Salvando..." : "Criar Agora"}</button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}