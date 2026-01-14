"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Ticket, CheckCircle, Search, Home, ChevronLeft, ChevronRight, AlertCircle, Twitch, Instagram, Clock, XCircle } from "lucide-react";

// Definição dos Tipos
type Sorteio = {
  nome: string;
  img: string;
  status: string;
  valor: string;
};

type TicketData = {
  id: number;
  data: string; 
  sorteio_id: string;
  coins: number;
  status: string; // Adicionado o campo status aqui
  sorteios?: Sorteio; 
};

const supabase = createClient();

// 9 ITENS POR PÁGINA (Paginação)
const ITENS_POR_PAGINA = 9; 

export default function MeusSorteios() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados da Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  const bgImageUrl = "/background.png";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      carregarMeusTickets(1); // Sempre começa na página 1 ao logar
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  const carregarMeusTickets = async (pagina: number) => {
    setLoading(true);
    try {
      // Cálculo do Range (de onde até onde buscar)
      const from = (pagina - 1) * ITENS_POR_PAGINA;
      const to = from + ITENS_POR_PAGINA - 1;

      // Busca com Paginação (.range) e Contagem (.count)
      const { data, error, count } = await supabase
        .from('tickets')
        .select(`
          id,
          data,
          coins,
          status, 
          sorteio_id,
          sorteios (
            nome,
            img,
            status,
            valor
          )
        `, { count: 'exact' }) 
        .eq('email', session?.user?.email)
        .order('id', { ascending: false })
        .range(from, to); 

      if (error) {
        // Fallback se der erro de Foreign Key (EditAqui)
        if (error.code === "PGRST200" || error.message.includes("foreign key")) {
            const { data: dataSimples, count: countSimples } = await supabase
                .from('tickets')
                .select('id, data, coins, status, sorteio_id', { count: 'exact' })
                .eq('email', session?.user?.email)
                .order('id', { ascending: false })
                .range(from, to);
            
            setTickets(dataSimples as any);
            setTotalTickets(countSimples || 0);
        } else {
            console.error("Erro:", error);
        }
      } else {
        setTickets(data as any);
        setTotalTickets(count || 0);
      }
      
      setPaginaAtual(pagina);

    } catch (error) {
      console.error("Erro geral:", error);
    } finally {
      setLoading(false);
    }
  };

  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
        carregarMeusTickets(novaPagina);
        window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  // --- LÓGICA DE STATUS RESTAURADA ---
  const renderStatus = (statusTicket: string) => {
    switch (statusTicket) {
        case "Aprovado":
            return (
                <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-3 py-1 rounded border border-green-400/20 text-xs font-bold uppercase tracking-wide">
                    <CheckCircle className="w-3.5 h-3.5" /> Confirmado
                </div>
            );
        case "Rejeitado":
            return (
                <div className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-3 py-1 rounded border border-red-400/20 text-xs font-bold uppercase tracking-wide">
                    <XCircle className="w-3.5 h-3.5" /> Recusado
                </div>
            );
        default: // Pendente ou qualquer outro
            return (
                <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded border border-yellow-500/20 text-xs font-bold uppercase tracking-wide animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> Analisando
                </div>
            );
    }
  };

  const totalPaginas = Math.ceil(totalTickets / ITENS_POR_PAGINA);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0f1014] flex flex-col items-center justify-center p-4 text-center">
        <Ticket className="w-16 h-16 text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Você precisa estar logado</h1>
        <button onClick={() => signIn("google")} className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold uppercase transition">
          Fazer Login
        </button>
      </div>
    );
  }

  return (
    <div 
        className="flex flex-col min-h-screen bg-[#0f1014] bg-cover bg-center bg-fixed"
        style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15, 16, 20, 0.95), rgba(15, 16, 20, 0.98)), url('${bgImageUrl}')`
        }}
    >
      <div className="h-32 w-full flex-shrink-0"></div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pb-40 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                    <Ticket className="text-yellow-500" /> Meus Tickets
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Mostrando {tickets.length} de {totalTickets} participações.
                </p>
            </div>
            
            <Link href="/" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 font-bold text-sm uppercase transition flex items-center gap-2">
                <Home className="w-4 h-4"/> Voltar para Home
            </Link>
        </div>

        {loading ? (
            <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Carregando...</p>
            </div>
        ) : tickets.length === 0 ? (
            <div className="bg-[#1b1e24]/50 border border-white/5 rounded-2xl p-12 text-center mt-10">
                <Search className="w-16 h-16 text-slate-700 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-white mb-2">Nenhum ticket encontrado</h3>
                <Link href="/" className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-lg font-black uppercase transition">
                    Ver Sorteios Ativos
                </Link>
            </div>
        ) : (
            <>
                {/* GRID DE TICKETS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="bg-[#1b1e24] border border-white/5 rounded-xl overflow-hidden hover:border-yellow-500/30 transition group shadow-lg flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                            
                            <div className="h-40 bg-[#15171c] relative overflow-hidden flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)]"></div>
                                
                                {ticket.sorteios ? (
                                    <img 
                                        src={ticket.sorteios.img} 
                                        alt={ticket.sorteios.nome} 
                                        className={`h-full object-contain drop-shadow-lg transition duration-500 group-hover:scale-110 ${ticket.sorteios.status === 'Finalizado' ? 'grayscale opacity-50' : ''}`}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center px-4">
                                        <AlertCircle className="w-8 h-8 text-yellow-500 mb-2 opacity-50"/>
                                        <span className="text-slate-500 text-xs font-bold uppercase">Sorteio não localizado</span>
                                        <span className="text-slate-700 text-[10px] mt-1 break-all">ID: {ticket.sorteio_id}</span>
                                    </div>
                                )}

                                {ticket.sorteios?.status === 'Finalizado' && (
                                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-red-500 font-bold uppercase border border-red-500/20">
                                        Sorteio Finalizado
                                    </div>
                                )}
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <div className="mb-4">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-1 truncate">
                                        {ticket.sorteios?.nome || "Ticket Avulso"}
                                    </h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        Registro: <span className="text-slate-300">{ticket.data || "Sem data"}</span>
                                    </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                                    <div className="text-left">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Sua Entrada</p>
                                        <p className="text-yellow-500 font-black text-lg">{ticket.coins} <span className="text-xs font-bold text-yellow-500/50">COINS</span></p>
                                    </div>
                                    <div className="text-right">
                                        {/* AQUI CHAMA A FUNÇÃO DE STATUS DINÂMICO */}
                                        {renderStatus(ticket.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* PAGINAÇÃO (CONTROLES) */}
                {totalPaginas > 1 && (
                    <div className="flex items-center justify-center gap-6 mt-8 p-4 bg-[#1b1e24]/50 border border-white/5 rounded-2xl w-fit mx-auto backdrop-blur-sm">
                        
                        <button 
                            onClick={() => mudarPagina(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-yellow-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white transition text-white border border-white/10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span className="text-slate-300 font-bold uppercase tracking-widest text-sm">
                            Página <span className="text-yellow-500">{paginaAtual}</span> de {totalPaginas}
                        </span>

                        <button 
                            onClick={() => mudarPagina(paginaAtual + 1)}
                            disabled={paginaAtual === totalPaginas}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-yellow-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white transition text-white border border-white/10"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                    </div>
                )}
            </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-[#0f1014] border-t-2 border-yellow-600 pt-16 pb-8 px-4 md:px-8 mt-auto z-10">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    <div className="space-y-4">
                        <img src="/image_1.png" alt="Canal do Soares" className="h-28 w-auto mx-auto md:mx-0 object-contain hover:opacity-100 transition" />
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Trazendo os melhores sorteios e conteúdo de CS2 para a comunidade. 
                            Participe, jogue limpo e boa sorte!
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold uppercase mb-6 tracking-wide text-sm">Navegação</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><Link href="/" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Início</Link></li>
                            <li><Link href="/mix" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Mix Maker</Link></li>
                            <li><Link href="/#parceiros" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Parceiros</Link></li>
                            <li><Link href="/meus-sorteios" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Meus Tickets</Link></li>
                            <li><a href="https://www.twitch.tv/soares" target="_blank" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Live Stream</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold uppercase mb-6 tracking-wide text-sm">Siga-nos</h4>
                        <div className="flex gap-4">
                            <a href="https://www.twitch.tv/soares" target="_blank" className="w-10 h-10 bg-[#0f1014] rounded flex items-center justify-center text-slate-400 hover:bg-[#9146ff] hover:text-white transition">
                                <Twitch className="w-5 h-5"/>
                            </a>
                            <a href="https://www.instagram.com/soarexcs/" target="_blank" className="w-10 h-10 bg-[#0f1014] rounded flex items-center justify-center text-slate-400 hover:bg-[#E1306C] hover:text-white transition">
                                <Instagram className="w-5 h-5"/>
                            </a>
                            
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-8 text-center">
                    <p className="text-slate-600 text-xs">
                        © 2026 Canal do Soares. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </footer>
    </div>
  );
}