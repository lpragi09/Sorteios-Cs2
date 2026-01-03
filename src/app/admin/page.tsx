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
  
  const [totalEntradasAtivas, setTotalEntradasAtivas] = useState(0);
  const [totalCoinsAtivos, setTotalCoinsAtivos] = useState(0);
  const [totalSorteiosAtivos, setTotalSorteiosAtivos] = useState(0);
  const [statsDetalhadas, setStatsDetalhadas] = useState<any>({});

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalEditarSorteio, setModalEditarSorteio] = useState<any>(null);
  const [modalEditarTicket, setModalEditarTicket] = useState<any>(null);
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

    let somaE = 0; let somaC = 0; let contaA = 0;
    const statsTemp: any = {};

    for (const s of sorteios) {
        const { data: tickets } = await supabase.from('tickets').select('coins').eq('sorteio_id', s.id);
        const totalT = tickets?.length || 0;
        const totalC = tickets?.reduce((acc, t) => acc + Number(t.coins), 0) || 0;
        statsTemp[s.id] = { entries: totalT, coins: totalC };
        if (s.status === "Ativo") { somaE += totalT; somaC += totalC; contaA++; }
    }
    setTotalEntradasAtivas(somaE);
    setTotalCoinsAtivos(somaC);
    setTotalSorteiosAtivos(contaA);
    setStatsDetalhadas(statsTemp);
  };

  const abrirSorteio = async (sorteio: any) => {
    setSorteioSelecionado(sorteio);
    // Busca tickets garantindo que filtramos pelo ID correto
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('sorteio_id', sorteio.id)
      .order('created_at', { ascending: false });
    
    setTicketsDoSorteio(tickets || []);
  };

  const handleUpdateSorteio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { error } = await supabase.from('sorteios').update({ 
        nome: modalEditarSorteio.nome, 
        valor: modalEditarSorteio.valor, 
        img: modalEditarSorteio.img 
      }).eq('id', modalEditarSorteio.id);
      if (error) throw error;
      setModalEditarSorteio(null);
      carregarDadosCompletos();
    } catch (err: any) { alert(err.message); } finally { setSalvando(false); }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { error } = await supabase.from('tickets').update({ 
        csgobigId: modalEditarTicket.csgobigId, 
        coins: modalEditarTicket.coins, 
        instagram: modalEditarTicket.instagram 
      }).eq('id', modalEditarTicket.id);
      if (error) throw error;
      setModalEditarTicket(null);
      if (sorteioSelecionado) abrirSorteio(sorteioSelecionado);
      carregarDadosCompletos();
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
    if (confirm("Deseja realmente excluir este sorteio e todas as suas entradas?")) {
        await supabase.from('tickets').delete().eq('sorteio_id', id);
        await supabase.from('sorteios').delete().eq('id', id);
        carregarDadosCompletos();
    }
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-2xl font-black text-yellow-500">PAINEL ADMIN</h1>
            <div className="flex gap-2">
                <button onClick={() => {setAbaAtiva("dashboard"); setSorteioSelecionado(null)}} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-slate-800 text-slate-400"}`}>Visão Geral</button>
                <button onClick={() => setAbaAtiva("sorteios")} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-slate-800 text-slate-400"}`}>Sorteios</button>
            </div>
        </div>

        {abaAtiva === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 text-xs font-bold uppercase">Sorteios Ativos</p>
                        <p className="text-3xl font-black">{totalSorteiosAtivos}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 text-xs font-bold uppercase">Entradas Ativas</p>
                        <p className="text-3xl font-black">{totalEntradasAtivas}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 text-xs font-bold uppercase">Pool Ativo</p>
                        <p className="text-3xl font-black text-green-400">{totalCoinsAtivos}</p>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-3">Detalhamento por Sorteio</h2>
                    <div className="space-y-3">
                        {listaSorteios.map((s) => (
                            <div key={s.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img src={s.img} className="w-12 h-12 object-contain bg-black rounded p-1" />
                                    <h3 className="font-bold">{s.nome}</h3>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-center"><p className="text-[10px] text-slate-400">ENTRADAS</p><p className="font-bold">{statsDetalhadas[s.id]?.entries || 0}</p></div>
                                    <div className="text-center"><p className="text-[10px] text-slate-400">COINS</p><p className="font-bold text-yellow-500">{statsDetalhadas[s.id]?.coins || 0}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {abaAtiva === "sorteios" && !sorteioSelecionado && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                {listaSorteios.map((s) => (
                    <div key={s.id} onClick={() => abrirSorteio(s)} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 cursor-pointer hover:border-yellow-500 transition relative">
                        <img src={s.img} className="w-20 h-20 object-contain bg-black rounded-lg p-2" />
                        <div className="flex-1">
                            <h3 className="text-lg font-bold">{s.nome}</h3>
                            <p className="text-slate-400 text-sm">R$ {s.valor}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={(e) => { e.stopPropagation(); setModalEditarSorteio(s); }} className="p-2 bg-blue-600 rounded text-white hover:bg-blue-500"><Edit size={18}/></button>
                           <button onClick={(e) => handleToggleStatus(e, s.id, s.status)} className="p-2 bg-slate-800 rounded">{s.status === "Finalizado" ? <Lock className="text-red-500" size={18}/> : <Unlock className="text-yellow-500" size={18}/>}</button>
                           <button onClick={(e) => handleDeletarSorteio(e, s.id)} className="p-2 bg-red-600 rounded text-white hover:bg-red-500"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {sorteioSelecionado && (
            <div className="animate-in slide-in-from-right-4 duration-500">
                <button onClick={() => setSorteioSelecionado(null)} className="text-slate-400 mb-4 flex items-center gap-1 hover:text-white">{"← Voltar"}</button>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-6 bg-slate-900/50 flex justify-between items-center border-b border-slate-800">
                        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="text-yellow-500"/> Gerenciar: {sorteioSelecionado.nome}</h2>
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
                            {ticketsDoSorteio.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500">Nenhuma entrada encontrada para este sorteio específico.</td></tr>
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
                                            <button onClick={() => setModalEditarTicket(t)} className="p-2 bg-slate-800 rounded text-blue-400 hover:bg-slate-700"><Edit size={16}/></button>
                                            {t.print && <a href={t.print} target="_blank" className="p-2 bg-slate-800 rounded text-green-400 hover:bg-slate-700"><Eye size={16}/></a>}
                                            <button onClick={() => supabase.from('tickets').update({status:'Aprovado'}).eq('id',t.id).then(()=>abrirSorteio(sorteioSelecionado))} className="p-2 bg-green-600 rounded text-white hover:bg-green-500"><CheckCircle size={16}/></button>
                                            <button onClick={() => supabase.from('tickets').update({status:'Rejeitado'}).eq('id',t.id).then(()=>abrirSorteio(sorteioSelecionado))} className="p-2 bg-red-600 rounded text-white hover:bg-red-500"><XCircle size={16}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL EDITAR SORTEIO */}
        {modalEditarSorteio && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Edit className="text-blue-500"/> EDITAR SORTEIO</h3>
                    <form onSubmit={handleUpdateSorteio} className="space-y-4">
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarSorteio.nome} onChange={e => setModalEditarSorteio({...modalEditarSorteio, nome: e.target.value})} />
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarSorteio.valor} onChange={e => setModalEditarSorteio({...modalEditarSorteio, valor: e.target.value})} />
                        <input type="url" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarSorteio.img} onChange={e => setModalEditarSorteio({...modalEditarSorteio, img: e.target.value})} />
                        <div className="flex gap-2 pt-4">
                            <button type="button" onClick={() => setModalEditarSorteio(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black hover:bg-yellow-400 transition">SALVAR</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL EDITAR TICKET */}
        {modalEditarTicket && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-yellow-500">EDITAR PARTICIPANTE</h3>
                    <form onSubmit={handleUpdateTicket} className="space-y-4">
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.instagram} onChange={e => setModalEditarTicket({...modalEditarTicket, instagram: e.target.value})} />
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.csgobigId} onChange={e => setModalEditarTicket({...modalEditarTicket, csgobigId: e.target.value})} />
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.coins} onChange={e => setModalEditarTicket({...modalEditarTicket, coins: e.target.value})} />
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditarTicket(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold uppercase text-xs">Fechar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black text-xs uppercase">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}