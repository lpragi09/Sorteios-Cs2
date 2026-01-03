"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Users, Gift, CheckCircle, XCircle, Plus, X, Upload, Trash2, Coins, BarChart3, Trophy, Lock, Unlock, TrendingUp, Sparkles, Edit, Eye } from "lucide-react";
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

  const [formNome, setFormNome] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formImgFile, setFormImgFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [modalSorteioAberto, setModalSorteioAberto] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [ganhadorRevelado, setGanhadorRevelado] = useState<any>(null);
  const [participanteFake, setParticipanteFake] = useState<any>(null);

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

    let somaE = 0, somaC = 0, contaA = 0;
    const statsTemp: any = {};

    for (const s of sorteios) {
        const { data: tickets } = await supabase.from('tickets').select('coins').eq('sorteio_id', s.id);
        const totalT = tickets?.length || 0;
        const totalC = tickets?.reduce((acc, t) => acc + Number(t.coins), 0) || 0;
        statsTemp[s.id] = { entries: totalT, coins: totalC };
        if (s.status === "Ativo") { somaE += totalT; somaC += totalC; contaA++; }
    }
    setTotalEntradasAtivas(somaE); setTotalCoinsAtivos(somaC); setTotalSorteiosAtivos(contaA); setStatsDetalhadas(statsTemp);
  };

  const abrirSorteio = async (sorteio: any) => {
    setSorteioSelecionado(sorteio);
    // BUSCA CORRIGIDA: Forçando a atualização da lista de tickets para o sorteio aberto
    const { data: tickets } = await supabase.from('tickets').select('*').eq('sorteio_id', sorteio.id).order('created_at', { ascending: false });
    setTicketsDoSorteio(tickets || []);
  };

  const handleUpdateSorteio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditarSorteio) return;
    setUploading(true);
    try {
        const { error } = await supabase.from('sorteios').update({ nome: modalEditarSorteio.nome, valor: modalEditarSorteio.valor }).eq('id', modalEditarSorteio.id);
        if (error) throw error;
        setModalEditarSorteio(null);
        carregarDadosCompletos();
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditarTicket) return;
    setUploading(true);
    try {
        const { error } = await supabase.from('tickets').update({ csgobigId: modalEditarTicket.csgobigId, coins: modalEditarTicket.coins, instagram: modalEditarTicket.instagram }).eq('id', modalEditarTicket.id);
        if (error) throw error;
        setModalEditarTicket(null);
        if (sorteioSelecionado) abrirSorteio(sorteioSelecionado);
        carregarDadosCompletos();
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  const validarTicket = async (id: number, novoStatus: string) => {
    await supabase.from('tickets').update({ status: novoStatus }).eq('id', id);
    if (sorteioSelecionado) abrirSorteio(sorteioSelecionado);
    carregarDadosCompletos();
  };

  const iniciarSorteio = () => {
    if (!sorteioSelecionado) return;
    const aprovados = ticketsDoSorteio.filter(t => t.status === "Aprovado");
    if (aprovados.length === 0) return alert("Nenhum ticket aprovado!");
    setModalSorteioAberto(true);
    setSorteando(true);
    setGanhadorRevelado(null);
    let interacoes = 0;
    const maxInteracoes = 50;
    const vencedorReal = aprovados[Math.floor(Math.random() * aprovados.length)];
    const loopSorteio = () => {
        setParticipanteFake(aprovados[Math.floor(Math.random() * aprovados.length)]);
        interacoes++;
        let delay = interacoes < 30 ? 50 : interacoes < 45 ? 150 : 400;
        if (interacoes < maxInteracoes) { setTimeout(loopSorteio, delay); } 
        else { setSorteando(false); setGanhadorRevelado(vencedorReal); }
    };
    loopSorteio();
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-2xl font-black text-yellow-500">PAINEL ADMIN</h1>
            <div className="flex gap-2">
                <button onClick={() => {setAbaAtiva("dashboard"); setSorteioSelecionado(null)}} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black shadow-lg" : "bg-slate-800 text-slate-400"}`}>Geral</button>
                <button onClick={() => setAbaAtiva("sorteios")} className={`px-4 py-2 rounded-lg font-bold ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-lg" : "bg-slate-800 text-slate-400"}`}>Sorteios</button>
            </div>
        </div>

        {abaAtiva === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-slate-400 text-xs font-bold uppercase">Sorteios Ativos</p><p className="text-3xl font-black">{totalSorteiosAtivos}</p></div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-slate-400 text-xs font-bold uppercase">Entradas Ativas</p><p className="text-3xl font-black">{totalEntradasAtivas}</p></div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><p className="text-slate-400 text-xs font-bold uppercase">Pool Ativo</p><p className="text-3xl font-black text-green-400">{totalCoinsAtivos}</p></div>
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-3"><TrendingUp size={20}/> Detalhamento Individual</h2>
                    <div className="space-y-3">
                        {listaSorteios.map((s) => (
                            <div key={s.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-4"><img src={s.img} className="w-12 h-12 object-contain bg-black rounded p-1" /><h3 className="font-bold">{s.nome}</h3></div>
                                <div className="flex gap-8">
                                    <div className="text-center"><p className="text-[10px] text-slate-400 uppercase">Entradas</p><p className="font-bold">{statsDetalhadas[s.id]?.entries || 0}</p></div>
                                    <div className="text-center"><p className="text-[10px] text-slate-400 uppercase">Coins</p><p className="font-bold text-yellow-500">{statsDetalhadas[s.id]?.coins || 0}</p></div>
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
                    <div key={s.id} onClick={() => abrirSorteio(s)} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 cursor-pointer hover:border-yellow-500 transition">
                        <img src={s.img} className="w-20 h-20 object-contain bg-black rounded-lg p-2" />
                        <div className="flex-1"><h3 className="text-lg font-bold">{s.nome}</h3><p className="text-slate-400 text-sm">R$ {s.valor}</p></div>
                        <div className="flex gap-2">
                           <button onClick={(e) => { e.stopPropagation(); setModalEditarSorteio(s); }} className="p-2 bg-blue-600 rounded text-white"><Edit size={18}/></button>
                           <button onClick={(e) => { e.stopPropagation(); supabase.from('sorteios').update({status: s.status === 'Ativo' ? 'Finalizado' : 'Ativo'}).eq('id', s.id).then(()=>carregarDadosCompletos())}} className="p-2 bg-slate-800 rounded">{s.status === "Finalizado" ? <Lock className="text-red-500" size={18}/> : <Unlock className="text-yellow-500" size={18}/>}</button>
                           <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) supabase.from('sorteios').delete().eq('id', s.id).then(()=>carregarDadosCompletos()) }} className="p-2 bg-red-600 rounded text-white"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {sorteioSelecionado && (
            <div className="animate-in slide-in-from-right-4 duration-500">
                <button onClick={() => setSorteioSelecionado(null)} className="text-slate-400 mb-4 flex items-center gap-1 hover:text-white">{"← Voltar"}</button>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="p-6 bg-slate-900/50 flex justify-between items-center border-b border-slate-800">
                        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="text-yellow-500"/> Entradas: {sorteioSelecionado.nome}</h2>
                        <button onClick={iniciarSorteio} className="bg-green-600 px-6 py-2 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-green-500 transition shadow-lg shadow-green-900/40"><Sparkles size={18}/> SORTEAR</button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[10px]">
                            <tr><th className="p-4">Usuário</th><th className="p-4">Big ID</th><th className="p-4">Coins</th><th className="p-4 text-center">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {ticketsDoSorteio.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500 italic">Nenhuma entrada encontrada para gerenciar.</td></tr>
                            ) : (
                                ticketsDoSorteio.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-800/30">
                                        <td className="p-4"><div className="font-bold text-blue-400">@{t.instagram}</div><div className="text-[10px] text-slate-500">{t.email}</div></td>
                                        <td className="p-4 font-mono text-white">{t.csgobigId}</td>
                                        <td className="p-4 text-yellow-500 font-black">{t.coins}</td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => setModalEditarTicket(t)} className="p-2 bg-blue-600 rounded text-white hover:bg-blue-500 transition"><Edit size={16}/></button>
                                            {t.print && <a href={t.print} target="_blank" className="p-2 bg-slate-800 rounded text-green-400 hover:bg-slate-700 transition" title="Ver Comprovante"><Eye size={16}/></a>}
                                            <button onClick={() => validarTicket(t.id, 'Aprovado')} className="p-2 bg-green-600 rounded text-white hover:bg-green-500 transition shadow-md"><CheckCircle size={16}/></button>
                                            <button onClick={() => validarTicket(t.id, 'Rejeitado')} className="p-2 bg-red-600 rounded text-white hover:bg-red-500 transition shadow-md"><XCircle size={16}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL EDITAR TICKET (USUÁRIO) */}
        {modalEditarTicket && (
            <div className="fixed inset-0 bg-black/90 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-6 text-yellow-500 flex items-center gap-2"><Edit size={20}/> EDITAR PARTICIPANTE</h3>
                    <form onSubmit={handleUpdateTicket} className="space-y-4">
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Instagram</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.instagram} onChange={e => setModalEditarTicket({...modalEditarTicket, instagram: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">CSGOBIG ID</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.csgobigId} onChange={e => setModalEditarTicket({...modalEditarTicket, csgobigId: e.target.value})} /></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Coins</label>
                        <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4" value={modalEditarTicket.coins} onChange={e => setModalEditarTicket({...modalEditarTicket, coins: Number(e.target.value)})} /></div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalEditarTicket(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold uppercase text-xs">Cancelar</button>
                            <button type="submit" className="flex-1 bg-yellow-500 py-4 rounded-xl font-black text-black text-xs uppercase hover:bg-yellow-400 transition">Atualizar Dados</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL ROLETA VENCEDOR */}
        {modalSorteioAberto && (
            <div className="fixed inset-0 bg-slate-950 z-[999] flex flex-col items-center justify-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1),transparent)] animate-pulse"></div>
                {!ganhadorRevelado && <button onClick={() => setModalSorteioAberto(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={32}/></button>}
                <div className="w-full max-w-2xl text-center relative z-10">
                    {sorteando ? (
                        <div className="space-y-12 animate-in zoom-in-90 duration-300">
                            <h2 className="text-3xl font-black text-white uppercase tracking-[0.4em]">SORTEANDO...</h2>
                            <div className="w-64 h-64 mx-auto rounded-full border-[8px] border-slate-900 shadow-2xl bg-slate-900 relative overflow-hidden">
                                <img src={participanteFake?.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full rounded-full object-cover blur-[1px] opacity-70" />
                            </div>
                            <div className="py-4 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-4xl font-black text-white font-mono">@{participanteFake?.instagram || "???"}</p></div>
                        </div>
                    ) : ganhadorRevelado ? (
                        <div className="space-y-8 animate-in fade-in zoom-in-50 duration-1000">
                            <div className="relative inline-block">
                                <Trophy className="w-24 h-24 text-yellow-500 absolute -top-12 -left-12 -rotate-12 animate-bounce shadow-2xl shadow-yellow-500/50" />
                                <div className="w-64 h-64 mx-auto rounded-full border-[10px] border-green-500 p-2 bg-slate-900 shadow-[0_0_100px_rgba(34,197,94,0.3)]">
                                    <img src={ganhadorRevelado.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full rounded-full object-cover" />
                                </div>
                            </div>
                            <h2 className="text-7xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">@{ganhadorRevelado.instagram}</h2>
                            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 inline-block px-10">
                                <p className="text-slate-400 text-xs uppercase font-bold mb-1">Big ID do Vencedor</p>
                                <p className="text-2xl font-mono text-yellow-500">{ganhadorRevelado.csgobigId}</p>
                            </div>
                            <button onClick={() => setModalSorteioAberto(false)} className="block mx-auto mt-10 px-16 py-5 bg-white text-black rounded-full font-black text-2xl hover:scale-105 transition-all shadow-2xl">FINALIZAR</button>
                        </div>
                    ) : null}
                </div>
            </div>
        )}
      </div>
    </main>
  );
}