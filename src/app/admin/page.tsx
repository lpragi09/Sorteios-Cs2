"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link"; 
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Shield, Users, Gift, CheckCircle, XCircle, ExternalLink, Plus, Pencil, X, Upload, Trash2, Coins, BarChart3, Trophy, RefreshCw, Lock, Unlock, TrendingUp, Sparkles, Zap, Twitch, Instagram, Youtube } from "lucide-react";

// --- TIPOS ---
type Sorteio = { id: string; nome: string; img: string; valor: string; status: "Ativo" | "Finalizado"; };
type Ticket = { id: number; data: string; csgobigId: string; coins: number; instagram: string; print: string; status: string; email?: string; userImage?: string; sorteio_id?: string; };
type Ganhador = { round: number; ticket: Ticket; dataGanhou: string; };
type StatsSorteio = { entries: number; coins: number; };

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const supabase = createClient(); 
  const ADMIN_EMAILS = ["soarescscontato@gmail.com", "lpmragi@gmail.com"];

  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [sorteioSelecionado, setSorteioSelecionado] = useState<Sorteio | null>(null);
  
  const [listaSorteios, setListaSorteios] = useState<Sorteio[]>([]);
  const [ticketsDoSorteio, setTicketsDoSorteio] = useState<Ticket[]>([]);
  const [totalEntradasAtivas, setTotalEntradasAtivas] = useState(0);
  const [totalCoinsAtivos, setTotalCoinsAtivos] = useState(0);
  const [totalSorteiosAtivos, setTotalSorteiosAtivos] = useState(0);
  const [statsDetalhadas, setStatsDetalhadas] = useState<Record<string, StatsSorteio>>({});

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [ticketEmEdicao, setTicketEmEdicao] = useState<Ticket | null>(null);
  const [sorteioEmEdicao, setSorteioEmEdicao] = useState<Sorteio | null>(null);

  const [modalSorteioAberto, setModalSorteioAberto] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [ganhadorRevelado, setGanhadorRevelado] = useState<Ticket | null>(null);
  const [participanteFake, setParticipanteFake] = useState<Ticket | null>(null);
  const [listaGanhadores, setListaGanhadores] = useState<Ganhador[]>([]);
  const [intensidadeEfeito, setIntensidadeEfeito] = useState(1);

  const [formNome, setFormNome] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formValor, setFormValor] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    const emailUsuario = session?.user?.email || "";
    if (status === "unauthenticated" || !ADMIN_EMAILS.includes(emailUsuario)) {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    carregarDadosCompletos();
  }, [status, session]);

  const carregarDadosCompletos = async () => {
    const { data: sorteiosData, error: sorteiosError } = await supabase.from('sorteios').select('*');
    if (sorteiosError) return;
    if (!sorteiosData || sorteiosData.length === 0) {
        const defaultSorteio = { id: "EditAqui", nome: "Edite Aqui", img: "", valor: "X", status: "Ativo" };
        await supabase.from('sorteios').insert([defaultSorteio]);
        setListaSorteios([defaultSorteio as any]);
    } else {
        setListaSorteios(sorteiosData as Sorteio[]);
    }
    const { data: allTickets } = await supabase.from('tickets').select('sorteio_id, coins');
    let somaE = 0, somaC = 0, contaA = 0;
    const statsTemp: Record<string, StatsSorteio> = {};
    (sorteiosData || []).forEach((s: any) => {
        const tickets = allTickets?.filter((t: any) => t.sorteio_id === s.id) || [];
        const coins = tickets.reduce((acc: number, t: any) => acc + Number(t.coins), 0);
        statsTemp[s.id] = { entries: tickets.length, coins };
        if (s.status === "Ativo") { somaE += tickets.length; somaC += coins; contaA++; }
    });
    setTotalEntradasAtivas(somaE); setTotalCoinsAtivos(somaC); setTotalSorteiosAtivos(contaA); setStatsDetalhadas(statsTemp);
  };

  const abrirSorteio = async (sorteio: Sorteio) => {
    setSorteioSelecionado(sorteio);
    const { data: ticketsRaw } = await supabase.from('tickets').select('*').eq('sorteio_id', sorteio.id);
    const ticketsFormatados: Ticket[] = (ticketsRaw || []).map((t: any) => ({
        id: t.id, data: t.data, csgobigId: t.csgobig_id, coins: t.coins, instagram: t.instagram, print: t.print, status: t.status, email: t.email, userImage: t.user_image, sorteio_id: t.sorteio_id
    }));
    setTicketsDoSorteio(ticketsFormatados);
    const { data: ganhadoresRaw } = await supabase.from('ganhadores').select(`round, data_ganhou, ticket:tickets (*)`).eq('sorteio_id', sorteio.id);
    const ganhadoresFormatados: Ganhador[] = (ganhadoresRaw || []).map((g: any) => ({
        round: g.round, dataGanhou: g.data_ganhou, ticket: { id: g.ticket.id, data: g.ticket.data, csgobigId: g.ticket.csgobig_id, coins: g.ticket.coins, instagram: g.ticket.instagram, print: g.ticket.print, status: g.ticket.status, email: g.ticket.email, userImage: g.ticket.user_image }
    }));
    setListaGanhadores(ganhadoresFormatados);
  };

  const iniciarSorteio = () => {
    if (!sorteioSelecionado) return;
    const ticketsAprovados = ticketsDoSorteio.filter((t: Ticket) => t.status === "Aprovado");
    const emailsGanhadores = listaGanhadores.map(g => g.ticket.email);
    const candidatos = ticketsAprovados.filter(t => !emailsGanhadores.includes(t.email));
    if (candidatos.length === 0) { alert("Nenhum participante disponível!"); return; }
    setModalSorteioAberto(true);
    setSorteando(true);
    setGanhadorRevelado(null);
    setIntensidadeEfeito(1);
    const totalCoins = candidatos.reduce((acc, t) => acc + Number(t.coins), 0);
    let randomPoint = Math.floor(Math.random() * totalCoins);
    let vencedorReal = candidatos[0];
    for (const t of candidatos) {
        randomPoint -= t.coins;
        if (randomPoint < 0) { vencedorReal = t; break; }
    }
    let interacoes = 0; const maxInteracoes = 50; 
    const loopSorteio = async () => {
        setParticipanteFake(candidatos[Math.floor(Math.random() * candidatos.length)]);
        interacoes++;
        let delay = 50; 
        if (interacoes > 30) delay = 100;
        if (interacoes > 40) delay = 250;
        if (interacoes > 45) delay = 500;
        if (interacoes < maxInteracoes) {
            setTimeout(loopSorteio, delay);
        } else {
            setSorteando(false);
            setGanhadorRevelado(vencedorReal);
            const novoRound = listaGanhadores.length + 1;
            const dataGanhou = new Date().toLocaleString();
            const { error } = await supabase.from('ganhadores').insert([{ sorteio_id: sorteioSelecionado.id, ticket_id: vencedorReal.id, round: novoRound, data_ganhou: dataGanhou }]);
            if (!error) {
                const novoG: Ganhador = { round: novoRound, ticket: vencedorReal, dataGanhou };
                setListaGanhadores([...listaGanhadores, novoG]);
            } else {
                alert("Erro ao salvar ganhador no banco.");
            }
        }
    };
    loopSorteio();
  };

  const handleToggleStatus = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const sorteio = listaSorteios.find(s => s.id === id);
    if (!sorteio) return;
    const novoStatus = sorteio.status === "Ativo" ? "Finalizado" : "Ativo";
    await supabase.from('sorteios').update({ status: novoStatus }).eq('id', id);
    const nova = listaSorteios.map(s => s.id === id ? { ...s, status: novoStatus } : s) as Sorteio[];
    setListaSorteios(nova);
    carregarDadosCompletos();
  };

  const handleDeletarSorteio = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); if (!confirm("Excluir sorteio?")) return;
    await supabase.from('sorteios').delete().eq('id', id);
    setListaSorteios(listaSorteios.filter(s => s.id !== id));
    carregarDadosCompletos();
  };

  const validarTicket = async (id: number, status: string) => {
    await supabase.from('tickets').update({ status }).eq('id', id);
    const nova = ticketsDoSorteio.map(t => t.id === id ? { ...t, status } : t);
    setTicketsDoSorteio(nova);
    carregarDadosCompletos();
  };

  const salvarEdicaoTicket = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ticketEmEdicao || !sorteioSelecionado) return;
    await supabase.from('tickets').update({ csgobig_id: ticketEmEdicao.csgobigId, coins: ticketEmEdicao.coins, instagram: ticketEmEdicao.instagram }).eq('id', ticketEmEdicao.id);
    const nova = ticketsDoSorteio.map(t => t.id === ticketEmEdicao.id ? ticketEmEdicao : t);
    setTicketsDoSorteio(nova);
    carregarDadosCompletos();
    setTicketEmEdicao(null);
  };

  const limparForm = () => { setFormNome(""); setFormImg(""); setFormValor(""); };
  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setFormImg(reader.result as string); reader.readAsDataURL(file); } };
  const handleCriarSorteio = async (e: React.FormEvent) => { e.preventDefault(); if (!formImg) return; const novo = { id: Date.now().toString(), nome: formNome, img: formImg, valor: formValor, status: "Ativo" }; await supabase.from('sorteios').insert([novo]); setListaSorteios([...listaSorteios, novo as Sorteio]); setModalCriarAberto(false); limparForm(); carregarDadosCompletos(); };
  const handleAbrirEdicaoSorteio = (e: React.MouseEvent, s: Sorteio) => { e.stopPropagation(); setSorteioEmEdicao(s); setFormNome(s.nome); setFormValor(s.valor); setFormImg(s.img); };
  const handleSalvarEdicaoSorteio = async (e: React.FormEvent) => { e.preventDefault(); if (!sorteioEmEdicao) return; const updates = { nome: formNome, valor: formValor, img: formImg }; await supabase.from('sorteios').update(updates).eq('id', sorteioEmEdicao.id); const nova = listaSorteios.map(s => s.id === sorteioEmEdicao.id ? { ...s, ...updates } : s) as Sorteio[]; setListaSorteios(nova); setSorteioEmEdicao(null); carregarDadosCompletos(); };
  const resetarGanhadores = async () => { if(confirm("Limpar histórico de ganhadores?")) { await supabase.from('ganhadores').delete().eq('sorteio_id', sorteioSelecionado?.id); setListaGanhadores([]); } };

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1014]">
        
        {/* --- SOLUÇÃO DO ESPAÇAMENTO --- */}
        {/* Div vazia empurra o conteúdo para baixo da navbar fixa */}
        <div className="h-32 w-full flex-shrink-0"></div>

        <main className="flex-1 text-white p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 border-b border-white/5 pb-6">
                <h1 className="text-3xl font-black text-white flex items-center gap-2 italic uppercase"><Shield className="text-yellow-500" /> PAINEL ADMIN</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => { setAbaAtiva("dashboard"); setSorteioSelecionado(null); }} className={`flex-1 md:flex-none px-6 py-2 rounded font-bold transition uppercase tracking-wide ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-[#1b1e24] text-slate-400 hover:text-white border border-white/5"}`}>Visão Geral</button>
                    <button onClick={() => setAbaAtiva("sorteios")} className={`flex-1 md:flex-none px-6 py-2 rounded font-bold transition uppercase tracking-wide ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-[#1b1e24] text-slate-400 hover:text-white border border-white/5"}`}>Sorteios</button>
                </div>
            </div>

            {/* CONTEÚDO (Mantido exatamente igual) */}
            {abaAtiva === "dashboard" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#1b1e24] p-6 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-yellow-500/50 hover:bg-[#1b1e24]/80 transition"><div className="bg-yellow-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-yellow-500"><Gift /></div><div><h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sorteios Ativos</h3><p className="text-3xl font-black">{totalSorteiosAtivos}</p></div></div>
                        <div className="bg-[#1b1e24] p-6 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-blue-500/50 hover:bg-[#1b1e24]/80 transition"><div className="bg-blue-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-blue-500"><Users /></div><div><h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Entradas Ativas</h3><p className="text-3xl font-black">{totalEntradasAtivas}</p></div></div>
                        <div className="bg-[#1b1e24] p-6 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-green-500/50 hover:bg-[#1b1e24]/80 transition"><div className="bg-green-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-green-500"><Coins /></div><div><h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Pool Ativo</h3><p className="text-3xl font-black text-green-400">{totalCoinsAtivos}</p></div></div>
                    </div>
                    <div><h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-3 uppercase italic"><TrendingUp className="text-blue-500"/> Detalhamento</h2>
                        <div className="space-y-3">{listaSorteios.map((s) => (<div key={s.id} className="bg-[#1b1e24] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#15171c] transition gap-4"><div className="flex items-center gap-4"><img src={s.img} className="w-12 h-12 object-contain bg-[#0f1014] rounded-lg p-1 border border-white/5" /><div><h3 className="font-bold text-white text-lg italic uppercase">{s.nome}</h3><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${s.status === 'Ativo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{s.status}</span></div></div><div className="flex gap-8 text-right justify-between md:justify-end"><div><p className="text-[10px] text-slate-400 uppercase tracking-widest">Entradas</p><p className="text-xl font-bold">{statsDetalhadas[s.id]?.entries || 0}</p></div><div><p className="text-[10px] text-slate-400 uppercase tracking-widest">Coins</p><p className="text-xl font-bold text-yellow-500">{statsDetalhadas[s.id]?.coins || 0}</p></div></div></div>))}</div>
                    </div>
                </div>
            )}

            {/* TABELA DE SORTEIOS */}
            {abaAtiva === "sorteios" && (
                <div className="animate-in fade-in duration-500">
                    {!sorteioSelecionado ? (
                        <div>
                            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold border-l-4 border-yellow-500 pl-3 uppercase italic">Gerenciamento</h2><button onClick={() => { limparForm(); setModalCriarAberto(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-bold transition shadow-lg shadow-green-900/20 uppercase text-sm"><Plus className="w-5 h-5"/> Novo Sorteio</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{listaSorteios.map((s) => (<div key={s.id} onClick={() => abrirSorteio(s)} className={`bg-[#1b1e24] p-6 rounded-2xl border cursor-pointer hover:border-yellow-500 transition group relative flex flex-col sm:flex-row sm:items-center gap-6 ${s.status === "Finalizado" ? "border-red-900/50 opacity-80" : "border-white/5"}`}><img src={s.img} className="w-24 h-24 object-contain bg-[#0f1014] rounded-xl p-2 transition group-hover:scale-110 border border-white/5" /><div className="flex-1"><h3 className="text-xl font-black text-white group-hover:text-yellow-500 transition italic uppercase">{s.nome}</h3><p className="text-slate-400 text-sm">R$ {s.valor}</p>{s.status === "Finalizado" && <span className="text-red-500 font-bold text-[10px] uppercase mt-1 inline-block border border-red-500 px-2 rounded">Encerrado</span>}</div><div className="flex gap-2 z-10"><button onClick={(e) => handleToggleStatus(e, s.id)} className={`p-2.5 rounded-lg shadow-lg transition ${s.status === "Ativo" ? "bg-[#0f1014] text-yellow-500 hover:bg-yellow-600 hover:text-white border border-white/5" : "bg-red-600 text-white hover:bg-red-500"}`}>{s.status === "Ativo" ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}</button><button onClick={(e) => handleAbrirEdicaoSorteio(e, s)} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500"><Pencil className="w-5 h-5" /></button><button onClick={(e) => handleDeletarSorteio(e, s.id)} className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-500"><Trash2 className="w-5 h-5" /></button></div></div>))}</div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                            <button onClick={() => setSorteioSelecionado(null)} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1 uppercase font-bold tracking-wide">{"<- Voltar"}</button>
                            <div className="bg-[#1b1e24] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 bg-[#1b1e24] flex flex-col sm:flex-row justify-between items-center gap-4"><h2 className="text-xl font-bold text-white flex gap-2 items-center italic uppercase"><BarChart3 className="text-yellow-500"/> Entradas: {sorteioSelecionado.nome}</h2><button onClick={iniciarSorteio} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-green-900/40 transition-all hover:scale-105 active:scale-95 uppercase italic"><Sparkles className="w-5 h-5"/> SORTEAR AGORA</button></div>
                                <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-400"><thead className="bg-[#15171c] text-slate-200 uppercase font-bold text-[10px]"><tr><th className="p-4">Data/Email</th><th className="p-4">ID</th><th className="p-4">Instagram</th><th className="p-4 text-center">Coins</th><th className="p-4 text-center">Print</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Ações</th></tr></thead><tbody className="divide-y divide-white/5">{ticketsDoSorteio.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">Nenhum ticket encontrado.</td></tr>) : (ticketsDoSorteio.map((t) => (<tr key={t.id} className="hover:bg-white/5 transition"><td className="p-4"><div>{t.data.split(",")[0]}</div><div className="text-[10px] text-slate-500">{t.email}</div></td><td className="p-4 text-white font-mono">{t.csgobigId}</td><td className="p-4 text-blue-400 font-bold">{t.instagram}</td><td className="p-4 text-center text-yellow-500 font-black">{t.coins}</td><td className="p-4 text-center"><a href={t.print} target="_blank" className="bg-[#0f1014] hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-[10px] inline-flex items-center gap-1 border border-white/10 shadow-sm transition">Abrir <ExternalLink className="w-3 h-3"/></a></td><td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${t.status === "Aprovado" ? "bg-green-500/10 text-green-400 border-green-500/20" : t.status === "Rejeitado" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}>{t.status}</span></td><td className="p-4 flex justify-center gap-2"><button onClick={() => setTicketEmEdicao(t)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md transition active:scale-90"><Pencil className="w-4 h-4" /></button><button onClick={() => validarTicket(t.id, "Aprovado")} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-md transition active:scale-90"><CheckCircle className="w-4 h-4" /></button><button onClick={() => validarTicket(t.id, "Rejeitado")} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition active:scale-90"><XCircle className="w-4 h-4" /></button></td></tr>)))}</tbody></table></div>
                            </div>
                            {listaGanhadores.length > 0 && (
                                <div className="mt-8 bg-[#1b1e24] rounded-2xl border border-white/5 p-6 animate-in fade-in duration-700">
                                    <h3 className="text-yellow-500 font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-sm"><Trophy className="w-5 h-5"/> Ganhadores Registrados</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{listaGanhadores.map(g => (<div key={g.ticket.id} className="bg-[#0f1014] p-4 rounded-2xl border border-green-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-green-500/50 transition"><div className="absolute top-0 right-0 p-1.5 bg-yellow-500 text-black font-black text-[10px] rounded-bl-xl shadow-lg">WINNER #{g.round}</div><img src={g.ticket.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-14 h-14 rounded-full border-2 border-yellow-500/50 object-cover group-hover:scale-110 transition" /><div><p className="font-black text-white text-lg leading-none">@{g.ticket.instagram}</p><p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">{g.dataGanhou}</p></div></div>))}</div>
                                    <button onClick={resetarGanhadores} className="mt-6 text-[10px] text-slate-500 hover:text-red-500 font-bold flex items-center gap-1 uppercase tracking-widest transition"><RefreshCw className="w-3 h-3"/> Resetar Sessão</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* MODAIS (Estilizados) */}
            {modalCriarAberto && (<div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95"><div className="bg-[#1b1e24] w-full max-w-md rounded-3xl border border-white/5 p-8 shadow-2xl relative"><button onClick={()=>setModalCriarAberto(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button><h3 className="font-black text-2xl mb-6 text-white uppercase tracking-tight">Criar Sorteio</h3><form onSubmit={handleCriarSorteio} className="space-y-5"><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Nome da Skin</label><input type="text" required value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-white focus:border-yellow-500 outline-none transition-all" placeholder="Ex: M4A4 | Howl" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Valor de Mercado</label><input type="text" required value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-white focus:border-yellow-500 outline-none transition-all" placeholder="Ex: 1.200,00" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Imagem da Skin</label><div className="border-2 border-dashed border-white/5 rounded-2xl p-6 text-center cursor-pointer relative hover:border-yellow-500/50 hover:bg-[#0f1014] transition-all group"><input type="file" accept="image/*" onChange={handleImagemChange} className="absolute inset-0 opacity-0 cursor-pointer" />{formImg ? <img src={formImg} className="h-24 mx-auto drop-shadow-2xl" /> : <div className="text-slate-500 flex flex-col items-center gap-2"><Upload className="w-8 h-8 group-hover:text-yellow-500 transition"/><span className="text-xs font-bold uppercase">Clique para enviar</span></div>}</div></div><button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 py-5 rounded-2xl font-black text-black text-lg transition-all shadow-lg shadow-yellow-900/10 active:scale-95 uppercase tracking-tighter">Salvar Sorteio</button></form></div></div>)}
            {sorteioEmEdicao && (<div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95"><div className="bg-[#1b1e24] w-full max-w-md rounded-3xl border border-blue-500/20 p-8 shadow-2xl relative"><button onClick={()=>setSorteioEmEdicao(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button><h3 className="font-black text-2xl mb-6 text-white uppercase tracking-tight flex items-center gap-2"><Pencil className="text-blue-500"/> Editar</h3><form onSubmit={handleSalvarEdicaoSorteio} className="space-y-5"><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Nome</label><input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-white focus:border-blue-500 outline-none" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Valor</label><input type="text" value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-white focus:border-blue-500 outline-none" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Imagem</label><div className="border-2 border-dashed border-white/5 rounded-2xl p-6 text-center relative hover:bg-[#0f1014] transition cursor-pointer"><input type="file" accept="image/*" onChange={handleImagemChange} className="absolute inset-0 opacity-0 cursor-pointer" />{formImg ? <img src={formImg} className="h-24 mx-auto" /> : <Upload className="mx-auto text-slate-500"/>}</div></div><button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white text-lg transition shadow-lg active:scale-95 uppercase tracking-tighter">Salvar Alterações</button></form></div></div>)}
            {ticketEmEdicao && (<div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95"><div className="bg-[#1b1e24] w-full max-w-md rounded-3xl border border-yellow-500/20 p-8 shadow-2xl relative"><button onClick={()=>setTicketEmEdicao(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button><h3 className="font-black text-2xl mb-6 text-white uppercase tracking-tight flex items-center gap-2"><Pencil className="text-yellow-500"/> Ajustar Ticket</h3><form onSubmit={salvarEdicaoTicket} className="space-y-5"><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">ID CSGOBIG</label><input type="text" value={ticketEmEdicao.csgobigId} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, csgobigId: e.target.value})} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-white outline-none" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Quantidade Coins</label><input type="number" value={ticketEmEdicao.coins} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, coins: Number(e.target.value)})} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-yellow-500 font-black" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nome Instagram</label><input type="text" value={ticketEmEdicao.instagram} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, instagram: e.target.value})} className="w-full bg-[#0f1014] border border-white/5 rounded-2xl p-4 text-white outline-none" /></div><button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl font-black text-white text-lg transition shadow-lg active:scale-95">SALVAR MUDANÇAS</button></form></div></div>)}
            {/* Modal de sorteio épico também atualizado com as cores, apenas escondido na minimização */}
            {modalSorteioAberto && (
                <div className="fixed inset-0 bg-[#0f1014] z-[999] flex flex-col items-center justify-center p-4 md:p-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.08),transparent)] animate-pulse"></div>
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20"><div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div></div>
                    {!ganhadorRevelado && (<button onClick={() => setModalSorteioAberto(false)} className="absolute top-8 right-8 text-slate-600 hover:text-white transition z-50"><X className="w-8 h-8"/></button>)}
                    <div className="w-full max-w-2xl text-center relative z-10">
                        {sorteando ? (
                            <div className="space-y-12 animate-in zoom-in-90 duration-300">
                                <div className="space-y-2"><h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.4em] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">Sorteando...</h2><p className="text-yellow-500 font-bold text-xs uppercase tracking-widest animate-pulse">Cruzando os dados dos coins</p></div>
                                <div className="relative group"><div className="absolute inset-0 bg-yellow-500 rounded-full blur-[60px] opacity-20 animate-pulse"></div><div className="w-56 h-56 md:w-72 md:h-72 mx-auto rounded-full border-[8px] border-[#0f1014] p-2 shadow-2xl bg-[#0f1014] relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div><img src={participanteFake?.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full rounded-full object-cover blur-[1px] opacity-70 transition-all duration-75 scale-105" style={{ filter: `blur(${intensidadeEfeito}px)` }}/><div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div></div><div className="mt-8 py-4 bg-[#1b1e24]/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden relative"><div className="absolute top-0 left-0 w-2 h-full bg-yellow-500"></div><p className="text-3xl md:text-5xl font-black text-white font-mono tracking-tighter truncate px-6">@{participanteFake?.instagram || "BUSCANDO"}</p></div></div>
                            </div>
                        ) : ganhadorRevelado ? (
                            <div className="space-y-8 animate-in fade-in zoom-in-50 duration-1000 ease-out flex flex-col items-center">
                                <div className="relative"><div className="absolute inset-0 bg-green-500 rounded-full blur-[100px] opacity-30 animate-pulse"></div><div className="relative z-10"><Trophy className="w-24 h-24 text-yellow-500 mx-auto absolute -top-16 -left-16 -rotate-12 animate-bounce drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" /><div className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-full border-[10px] border-green-500 p-2 shadow-[0_0_100px_rgba(34,197,94,0.5)] bg-[#0f1014] transform hover:scale-105 transition duration-500"><img src={ganhadorRevelado.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full rounded-full object-cover"/></div><Sparkles className="w-24 h-24 text-yellow-500 mx-auto absolute -bottom-12 -right-12 animate-pulse drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" /></div></div>
                                <div className="space-y-4"><div className="inline-block px-6 py-2 bg-green-500 text-black font-black rounded-full text-sm uppercase tracking-widest animate-bounce shadow-lg shadow-green-500/20">VENCEDOR IDENTIFICADO</div><h2 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">@{ganhadorRevelado.instagram}</h2><div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4"><div className="px-6 py-3 bg-[#1b1e24] border border-white/5 rounded-2xl flex items-center gap-3"><Coins className="text-yellow-500 w-6 h-6"/><span className="text-xl font-black text-white">{ganhadorRevelado.coins} COINS</span></div><div className="px-6 py-3 bg-[#1b1e24] border border-white/5 rounded-2xl flex items-center gap-3"><Zap className="text-blue-500 w-6 h-6"/><span className="text-lg font-bold text-slate-300 uppercase tracking-tighter">{ganhadorRevelado.csgobigId}</span></div></div></div>
                                <button onClick={() => setModalSorteioAberto(false)} className="mt-10 group relative px-16 py-5 bg-white text-black rounded-full font-black text-2xl hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95">CONTINUAR SESSÃO<div className="absolute inset-0 rounded-full border-2 border-white group-hover:scale-125 group-hover:opacity-0 transition duration-500"></div></button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
        </main>

        
    </div>
  );
}