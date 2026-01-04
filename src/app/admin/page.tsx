"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// CORREÇÃO 1: Adicionado ExternalLink nos imports
import { Shield, Users, Gift, CheckCircle, XCircle, Plus, X, Upload, Trash2, Coins, BarChart3, Trophy, Lock, Unlock, TrendingUp, Sparkles, Edit, Eye, AlertCircle, Pencil, ExternalLink } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TIPOS ---
type Sorteio = {
    id: string;
    nome: string;
    img: string;
    valor: string;
    status: "Ativo" | "Finalizado";
};

type Ticket = {
    id: number;
    data: string;
    csgobigId?: string;
    csgobig_id?: string;
    coins: number;
    instagram: string;
    print?: string;
    print_url?: string;
    status: string;
    email?: string; 
    userImage?: string; 
    sorteio_nome?: string;
};

// Tipo visual para a lista de ganhadores
type GanhadorVisual = {
    round: number;
    ticket: Ticket;
    dataGanhou: string;
};

type StatsSorteio = {
    entries: number;
    coins: number;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const ADMIN_EMAIL = "lpmragi@gmail.com";

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
  const [modalEditarSorteio, setModalEditarSorteio] = useState<Sorteio | null>(null);
  const [sorteioEmEdicao, setSorteioEmEdicao] = useState<Sorteio | null>(null);
  const [modalEditarTicket, setModalEditarTicket] = useState<Ticket | null>(null);
  const [ticketEmEdicao, setTicketEmEdicao] = useState<Ticket | null>(null);

  // --- ESTADOS DO SORTEIO ---
  const [modalSorteioAberto, setModalSorteioAberto] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [ganhadorRevelado, setGanhadorRevelado] = useState<Ticket | null>(null);
  const [participanteFake, setParticipanteFake] = useState<Ticket | null>(null);
  
  // CORREÇÃO 3: Tipagem explícita para evitar erro de atribuição
  const [listaGanhadores, setListaGanhadores] = useState<GanhadorVisual[]>([]);

  const [formNome, setFormNome] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formImgFile, setFormImgFile] = useState<File | null>(null);
  const [formImgUrl, setFormImgUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.email !== ADMIN_EMAIL) {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    carregarDadosCompletos();
  }, [status, session, router]);

  // CORREÇÃO 2: Função limparForm adicionada
  const limparForm = () => {
      setFormNome("");
      setFormValor("");
      setFormImgFile(null);
      setFormImgUrl("");
  };

  const carregarDadosCompletos = async () => {
    const { data: sorteios } = await supabase.from('sorteios').select('*').order('created_at', { ascending: false });
    if (!sorteios) return;
    setListaSorteios(sorteios);

    let somaE = 0, somaC = 0, contaA = 0;
    const statsTemp: Record<string, StatsSorteio> = {};

    for (const s of sorteios) {
        // Busca robusta (ID ou Nome)
        const { data: tickets } = await supabase
            .from('tickets')
            .select('coins')
            .or(`sorteio_id.eq.${s.id},sorteio_nome.eq."${s.nome}"`);
            
        const totalTickets = tickets?.length || 0;
        const totalCoins = tickets?.reduce((acc, t) => acc + Number(t.coins), 0) || 0;
        statsTemp[s.id] = { entries: totalTickets, coins: totalCoins };
        if (s.status === "Ativo") { somaE += totalTickets; somaC += totalCoins; contaA++; }
    }
    setTotalEntradasAtivas(somaE); setTotalCoinsAtivos(somaC); setTotalSorteiosAtivos(contaA); setStatsDetalhadas(statsTemp);
  };

  const abrirSorteio = async (sorteio: Sorteio) => {
    setSorteioSelecionado(sorteio);
    
    // Busca robusta para lista de tickets (ID ou Nome)
    const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .or(`sorteio_id.eq.${sorteio.id},sorteio_nome.eq."${sorteio.nome}"`)
        .order('created_at', { ascending: false });
    
    setTicketsDoSorteio(tickets || []);

    // Busca Ganhadores
    const { data: ganhadores } = await supabase.from('ganhadores').select('*, ticket:tickets(*)').eq('sorteio_id', sorteio.id);
    
    // Mapeamento corrigido para o tipo visual
    const ganhadoresFormatados: GanhadorVisual[] = ganhadores?.map((g: any, index: number) => ({
        round: index + 1,
        ticket: g.ticket, // O Supabase já traz o objeto ticket aqui pelo join
        dataGanhou: new Date(g.created_at).toLocaleString()
    })) || [];
    
    setListaGanhadores(ganhadoresFormatados);
  };

  const iniciarSorteio = () => {
    if (!sorteioSelecionado) return;
    const aprovados = ticketsDoSorteio.filter(t => t.status === "Aprovado");
    
    const idsGanhadores = listaGanhadores.map(g => g.ticket.id);
    const candidatos = aprovados.filter(t => !idsGanhadores.includes(t.id));

    if (candidatos.length === 0) return alert("Nenhum ticket aprovado disponível para sortear!");
    
    setModalSorteioAberto(true);
    setSorteando(true);
    setGanhadorRevelado(null);

    const maxInteracoes = 50;
    const totalCoins = candidatos.reduce((acc, t) => acc + Number(t.coins), 0);
    let randomPoint = Math.floor(Math.random() * totalCoins);
    let vencedorReal = candidatos[0];
    
    for (const t of candidatos) {
        randomPoint -= t.coins;
        if (randomPoint < 0) { vencedorReal = t; break; }
    }

    let interacoes = 0;
    const loopSorteio = () => {
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
            salvarGanhador(vencedorReal);
        }
    };
    loopSorteio();
  };

  const salvarGanhador = async (ticket: Ticket) => {
      if(!sorteioSelecionado) return;
      await supabase.from('ganhadores').insert([{
          sorteio_id: sorteioSelecionado.id,
          ticket_id: ticket.id,
          created_at: new Date().toISOString()
      }]);
      setListaGanhadores(prev => [...prev, {
          round: prev.length + 1,
          ticket: ticket,
          dataGanhou: new Date().toLocaleString()
      }]);
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (file) setFormImgFile(file);
  };

  // --- CRUD ---
  const handleCriarSorteio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImgFile) return alert("Selecione uma imagem!");
    setUploading(true);
    try {
      const fileExt = formImgFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("sorteios").upload(`skins/${fileName}`, formImgFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("sorteios").getPublicUrl(`skins/${fileName}`);
      const { error: dbError } = await supabase.from('sorteios').insert([{
        nome: formNome, img: urlData.publicUrl, valor: formValor, status: "Ativo"
      }]);
      if (dbError) throw dbError;
      setModalCriarAberto(false);
      limparForm();
      carregarDadosCompletos();
      alert("✅ Criado!");
    } catch (err: any) { alert("Erro: " + err.message); } finally { setUploading(false); }
  };

  const handleSalvarEdicaoSorteio = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!sorteioEmEdicao) return;
      setUploading(true);
      try {
          let finalImg = formImgUrl;
          if (formImgFile) {
            const fileExt = formImgFile.name.split('.').pop();
            const fileName = `${Date.now()}_edit.${fileExt}`;
            await supabase.storage.from("sorteios").upload(`skins/${fileName}`, formImgFile);
            const { data } = supabase.storage.from("sorteios").getPublicUrl(`skins/${fileName}`);
            finalImg = data.publicUrl;
          }
          await supabase.from('sorteios').update({ nome: formNome, valor: formValor, img: finalImg }).eq('id', sorteioEmEdicao.id);
          setSorteioEmEdicao(null);
          carregarDadosCompletos();
          alert("✅ Editado!");
      } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  const handleSalvarEdicaoTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketEmEdicao) return;
    setUploading(true);
    try {
        await supabase.from('tickets').update({
            csgobig_id: ticketEmEdicao.csgobigId || ticketEmEdicao.csgobig_id,
            coins: ticketEmEdicao.coins,
            instagram: ticketEmEdicao.instagram
        }).eq('id', ticketEmEdicao.id);
        
        setTicketEmEdicao(null);
        if (sorteioSelecionado) abrirSorteio(sorteioSelecionado);
        await carregarDadosCompletos(); 
        alert("✅ Ticket atualizado!");
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  const handleAbrirEdicaoSorteio = (e: React.MouseEvent, s: Sorteio) => {
      e.stopPropagation();
      setSorteioEmEdicao(s);
      setFormNome(s.nome);
      setFormValor(s.valor);
      setFormImgUrl(s.img);
      setFormImgFile(null);
  };

  const handleToggleStatus = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const sorteio = listaSorteios.find(s => s.id === id);
    if (!sorteio) return;
    const novoStatus = sorteio.status === "Ativo" ? "Finalizado" : "Ativo";
    await supabase.from('sorteios').update({ status: novoStatus }).eq('id', id);
    await carregarDadosCompletos(); 
  };

  const handleDeletarSorteio = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Excluir sorteio permanentemente?")) return;
    await supabase.from('sorteios').delete().eq('id', id);
    await carregarDadosCompletos();
  };

  const validarTicket = async (id: number, status: string) => {
    await supabase.from('tickets').update({ status }).eq('id', id);
    if (sorteioSelecionado) abrirSorteio(sorteioSelecionado);
    await carregarDadosCompletos();
  };

  const renderStatus = (status: string) => {
      if (status === 'Aprovado') return <span className="bg-green-900/30 text-green-400 border border-green-800 text-[10px] px-2 py-1 rounded font-bold uppercase flex items-center gap-1 w-fit"><CheckCircle size={10}/> Aprovado</span>;
      if (status === 'Rejeitado') return <span className="bg-red-900/30 text-red-400 border border-red-800 text-[10px] px-2 py-1 rounded font-bold uppercase flex items-center gap-1 w-fit"><XCircle size={10}/> Rejeitado</span>;
      return <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-800 text-[10px] px-2 py-1 rounded font-bold uppercase flex items-center gap-1 w-fit"><AlertCircle size={10}/> Pendente</span>;
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-black text-white flex items-center gap-2 tracking-tighter"><Shield className="text-yellow-500" /> PAINEL ADMIN</h1>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => { setAbaAtiva("dashboard"); setSorteioSelecionado(null); }} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold transition-all ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black shadow-lg" : "bg-slate-800 text-slate-400"}`}>Visão Geral</button>
                <button onClick={() => setAbaAtiva("sorteios")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold transition-all ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-yellow-500/20 shadow-lg" : "bg-slate-800 text-slate-400"}`}>Sorteios</button>
            </div>
        </div>

        {abaAtiva === "dashboard" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 transition hover:border-yellow-500/50 hover:bg-slate-900/80"><div className="bg-yellow-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-yellow-500"><Gift /></div><div><h3 className="text-slate-400 text-xs font-bold uppercase">Sorteios Ativos</h3><p className="text-3xl font-black">{totalSorteiosAtivos}</p></div></div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 transition hover:border-blue-500/50 hover:bg-slate-900/80"><div className="bg-blue-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-blue-500"><Users /></div><div><h3 className="text-slate-400 text-xs font-bold uppercase">Entradas Ativas</h3><p className="text-3xl font-black">{totalEntradasAtivas}</p></div></div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4 transition hover:border-green-500/50 hover:bg-slate-900/80"><div className="bg-green-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-green-500"><Coins /></div><div><h3 className="text-slate-400 text-xs font-bold uppercase">Pool Ativo</h3><p className="text-3xl font-black text-green-400">{totalCoinsAtivos}</p></div></div>
                </div>
                <div><h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-3"><TrendingUp className="text-blue-500"/> Detalhamento Individual</h2>
                    <div className="space-y-3">{listaSorteios.map((s) => (<div key={s.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-800 transition gap-4"><div className="flex items-center gap-4"><img src={s.img} alt="" className="w-12 h-12 object-contain bg-slate-950 rounded p-1" /><div><h3 className="font-bold text-white text-lg">{s.nome}</h3><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${s.status === 'Ativo' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>{s.status}</span></div></div><div className="flex gap-8 text-right justify-between md:justify-end"><div><p className="text-[10px] text-slate-400 uppercase">Entradas</p><p className="text-xl font-bold">{statsDetalhadas[s.id]?.entries || 0}</p></div><div><p className="text-[10px] text-slate-400 uppercase">Coins</p><p className="text-xl font-bold text-yellow-500">{statsDetalhadas[s.id]?.coins || 0}</p></div></div></div>))}</div>
                </div>
            </div>
        )}

        {abaAtiva === "sorteios" && (
            <div className="animate-in fade-in duration-500">
                {!sorteioSelecionado ? (
                    <div>
                        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold border-l-4 border-yellow-500 pl-3">Gerenciamento</h2><button onClick={() => { limparForm(); setModalCriarAberto(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-bold transition shadow-lg"><Plus className="w-5 h-5"/> Novo Sorteio</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{listaSorteios.map((s) => (<div key={s.id} onClick={() => abrirSorteio(s)} className={`bg-slate-900 p-6 rounded-2xl border cursor-pointer hover:border-yellow-500 transition group relative flex flex-col sm:flex-row sm:items-center gap-6 ${s.status === "Finalizado" ? "border-red-900/50 opacity-80" : "border-slate-800"}`}><img src={s.img} alt="" className="w-24 h-24 object-contain bg-slate-950 rounded-xl p-2 transition group-hover:scale-110" /><div className="flex-1"><h3 className="text-xl font-bold text-white group-hover:text-yellow-500 transition">{s.nome}</h3><p className="text-slate-400 text-sm">R$ {s.valor}</p>{s.status === "Finalizado" && <span className="text-red-500 font-bold text-[10px] uppercase mt-1 inline-block border border-red-500 px-2 rounded">Encerrado</span>}</div><div className="flex gap-2 z-10"><button onClick={(e) => handleAbrirEdicaoSorteio(e, s)} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500"><Pencil size={18}/></button><button onClick={(e) => handleToggleStatus(e, s.id)} className={`p-2.5 rounded-lg shadow-lg transition ${s.status === "Ativo" ? "bg-slate-700 text-yellow-500 hover:bg-yellow-600 hover:text-white" : "bg-red-600 text-white hover:bg-red-500"}`}>{s.status === "Ativo" ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}</button><button onClick={(e) => handleDeletarSorteio(e, s.id)} className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-500"><Trash2 className="w-5 h-5" /></button></div></div>))}</div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                        <button onClick={() => setSorteioSelecionado(null)} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors">{"← Voltar"}</button>
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4"><h2 className="text-xl font-bold text-white flex gap-2 items-center"><BarChart3 className="text-yellow-500"/> Entradas: {sorteioSelecionado.nome}</h2><button onClick={iniciarSorteio} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-green-900/40 transition-all hover:scale-105 active:scale-95"><Sparkles className="w-5 h-5"/> SORTEAR AGORA</button></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-[10px]">
                                        <tr><th className="p-4">Status</th><th className="p-4">Usuário / Email</th><th className="p-4">ID</th><th className="p-4">Instagram</th><th className="p-4 text-center">Coins</th><th className="p-4 text-center">Print</th><th className="p-4 text-center">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {ticketsDoSorteio.length === 0 ? (<tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">Nenhum ticket encontrado.</td></tr>) : (ticketsDoSorteio.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-800/50 transition">
                                                <td className="p-4">{renderStatus(t.status)}</td>
                                                <td className="p-4"><div><div className="font-bold text-white">@{t.instagram}</div><div className="text-[10px] text-slate-500">{t.email}</div></div></td>
                                                <td className="p-4 text-white font-mono">{t.csgobigId || t.csgobig_id || "-"}</td>
                                                <td className="p-4 text-blue-400 font-bold">{t.instagram}</td>
                                                <td className="p-4 text-center text-yellow-500 font-black">{t.coins}</td>
                                                <td className="p-4 text-center">{t.print || t.print_url ? (
                                                    <a href={t.print || t.print_url} target="_blank" className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] inline-flex items-center gap-1 border border-slate-700 shadow-sm transition">Abrir <ExternalLink className="w-3 h-3"/></a>
                                                ) : (
                                                    <button disabled className="p-2 bg-slate-800 text-slate-600 rounded-lg cursor-not-allowed" title="Sem Comprovante"><Eye className="w-4 h-4" /></button>
                                                )}</td>
                                                <td className="p-4 flex justify-center gap-2">
                                                    <button onClick={() => setTicketEmEdicao(t)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition" title="Editar"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => validarTicket(t.id, "Aprovado")} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow-md transition active:scale-90" title="Aprovar"><CheckCircle className="w-4 h-4" /></button>
                                                    <button onClick={() => validarTicket(t.id, "Rejeitado")} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition active:scale-90" title="Rejeitar"><XCircle className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        )))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {listaGanhadores.length > 0 && (
                            <div className="mt-8 bg-slate-900 rounded-2xl border border-slate-800 p-6 animate-in fade-in duration-700">
                                <h3 className="text-yellow-500 font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-sm"><Trophy className="w-5 h-5"/> Ganhadores Registrados</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {listaGanhadores.map(g => (
                                        <div key={g.ticket.id} className="bg-slate-950 p-4 rounded-2xl border border-green-900/30 flex items-center gap-4 relative overflow-hidden group hover:border-green-500/50 transition">
                                            <div className="absolute top-0 right-0 p-1.5 bg-yellow-500 text-black font-black text-[10px] rounded-bl-xl shadow-lg">WINNER #{g.round}</div>
                                            <img src={g.ticket.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-14 h-14 rounded-full border-2 border-yellow-500/50 object-cover group-hover:scale-110 transition" />
                                            <div>
                                                <p className="font-black text-white text-lg leading-none">@{g.ticket.instagram}</p>
                                                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">{g.dataGanhou}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* MODAL SORTEIO */}
        {modalSorteioAberto && (
            <div className="fixed inset-0 bg-slate-950 z-[999] flex flex-col items-center justify-center p-4 md:p-10 backdrop-blur-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.08),transparent)] animate-pulse"></div>
                {!ganhadorRevelado && (<button onClick={() => setModalSorteioAberto(false)} className="absolute top-8 right-8 text-slate-600 hover:text-white transition z-50"><X className="w-8 h-8"/></button>)}
                <div className="w-full max-w-2xl text-center relative z-10">
                    {sorteando ? (
                        <div className="space-y-12 animate-in zoom-in-90 duration-300">
                            <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-[0.4em]">Sorteando...</h2>
                            <div className="w-56 h-56 md:w-72 md:h-72 mx-auto rounded-full border-[8px] border-slate-900 shadow-2xl bg-slate-900 relative overflow-hidden">
                                <img src={participanteFake?.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="" className="w-full h-full rounded-full object-cover blur-[1px] opacity-70" />
                            </div>
                            <div className="mt-8 py-4 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-3xl md:text-5xl font-black text-white font-mono">@{participanteFake?.instagram || "BUSCANDO"}</p></div>
                        </div>
                    ) : ganhadorRevelado ? (
                        <div className="space-y-8 animate-in fade-in zoom-in-50 duration-1000 ease-out flex flex-col items-center">
                            <div className="relative z-10">
                                <Trophy className="w-24 h-24 text-yellow-500 mx-auto absolute -top-16 -left-16 -rotate-12 animate-bounce" />
                                <div className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-full border-[10px] border-green-500 p-2 shadow-[0_0_100px_rgba(34,197,94,0.5)] bg-slate-900"><img src={ganhadorRevelado.userImage || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="" className="w-full h-full rounded-full object-cover" /></div>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">@{ganhadorRevelado.instagram}</h2>
                            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800"><p className="text-slate-400 uppercase text-xs font-bold mb-1 tracking-widest text-center">ID do Ganhador</p><p className="text-2xl font-mono text-yellow-500 text-center">{ganhadorRevelado.csgobigId || ganhadorRevelado.csgobig_id}</p></div>
                            <button onClick={() => setModalSorteioAberto(false)} className="mt-10 px-16 py-5 bg-white text-black rounded-full font-black text-2xl hover:scale-105 transition-all shadow-2xl">FINALIZAR SESSÃO</button>
                        </div>
                    ) : null}
                </div>
            </div>
        )}

        {/* MODAL CRIAR */}
        {modalCriarAberto && (<div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95"><div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 p-8 shadow-2xl relative"><button onClick={()=>setModalCriarAberto(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button><h3 className="font-black text-2xl mb-6 text-white uppercase tracking-tight">Criar Sorteio</h3><form onSubmit={handleCriarSorteio} className="space-y-5"><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Nome da Skin</label><input type="text" required value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-yellow-500 outline-none transition-all" placeholder="Ex: M4A4 | Howl" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Valor de Mercado</label><input type="text" required value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-yellow-500 outline-none transition-all" placeholder="Ex: 1.200,00" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Imagem da Skin</label><div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center cursor-pointer relative hover:border-yellow-500/50 hover:bg-slate-950/50 transition-all group"><input type="file" accept="image/*" onChange={handleImagemChange} className="absolute inset-0 opacity-0 cursor-pointer" />{formImgFile ? <p className="text-white text-xs">{formImgFile.name}</p> : <div className="text-slate-500 flex flex-col items-center gap-2"><Upload className="w-8 h-8 group-hover:text-yellow-500 transition"/><span className="text-xs font-bold uppercase">Clique para enviar</span></div>}</div></div><button type="submit" disabled={uploading} className="w-full bg-yellow-500 hover:bg-yellow-400 py-5 rounded-2xl font-black text-black text-lg transition-all shadow-lg shadow-yellow-900/10 active:scale-95 uppercase tracking-tighter">{uploading ? "Enviando..." : "Salvar Sorteio"}</button></form></div></div>)}
        
        {sorteioEmEdicao && (<div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95"><div className="bg-slate-900 w-full max-w-md rounded-3xl border border-blue-500/20 p-8 shadow-2xl relative"><button onClick={()=>setSorteioEmEdicao(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button><h3 className="font-black text-2xl mb-6 text-white uppercase tracking-tight flex items-center gap-2"><Pencil className="text-blue-500"/> Editar</h3><form onSubmit={handleSalvarEdicaoSorteio} className="space-y-5"><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Nome</label><input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Valor</label><input type="text" value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Trocar Imagem (Opcional)</label><div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center relative hover:bg-slate-950 transition cursor-pointer"><input type="file" accept="image/*" onChange={handleImagemChange} className="absolute inset-0 opacity-0 cursor-pointer" />{formImgFile ? <p className="text-white text-xs">{formImgFile.name}</p> : <Upload className="mx-auto text-slate-500"/>}</div></div><button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white text-lg transition shadow-lg active:scale-95 uppercase tracking-tighter">{uploading ? "Salvando..." : "Salvar Alterações"}</button></form></div></div>)}
        
        {ticketEmEdicao && (<div className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95"><div className="bg-slate-900 w-full max-w-md rounded-3xl border border-yellow-500/20 p-8 shadow-2xl relative"><button onClick={()=>setTicketEmEdicao(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X/></button><h3 className="font-black text-2xl mb-6 text-white uppercase tracking-tight flex items-center gap-2"><Pencil className="text-yellow-500"/> Ajustar Ticket</h3><form onSubmit={handleSalvarEdicaoTicket} className="space-y-5"><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">ID CSGOBIG</label><input type="text" value={ticketEmEdicao.csgobigId || ticketEmEdicao.csgobig_id} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, csgobigId: e.target.value, csgobig_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Quantidade Coins</label><input type="number" value={ticketEmEdicao.coins} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, coins: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-yellow-500 font-black" /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nome Instagram</label><input type="text" value={ticketEmEdicao.instagram} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, instagram: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none" /></div><button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl font-black text-white text-lg transition shadow-lg active:scale-95">SALVAR MUDANÇAS</button></form></div></div>)}
      </div>
    </main>
  );
}