"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Coins, AlertCircle, Trophy, XCircle, Ban, ArrowLeft, Twitch, Instagram, Youtube } from "lucide-react";
import { createClient } from "../../lib/supabaseClient";

const supabase = createClient();

type Ticket = {
    id: number;
    data: string;
    email: string;
    csgobigId: string;
    coins: number;
    status: string;
    nomeSorteio?: string;
    imgSorteio?: string;
    resultado?: "GANHOU" | "PERDEU" | "AGUARDANDO";
};

export default function MeusSorteiosPage() {
  const { data: session } = useSession();
  const [ticketsUsuario, setTicketsUsuario] = useState<Ticket[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- ALTERADO: Agora aponta para o arquivo local na pasta public ---
  // Certifique-se de que o nome do arquivo na pasta public seja exatamente 'background.png'
  const bgImageUrl = "/background.png"; 

  useEffect(() => {
    if (!session?.user?.email) {
      setCarregando(false);
      return;
    }

    const buscarDadosGlobais = async () => {
      try {
        setCarregando(true);
        const emailUsuario = session?.user?.email || "";

        const { data: tickets, error: errT } = await supabase
          .from('tickets')
          .select(`*, sorteio:sorteios ( id, nome, img, status )`)
          .eq('email', emailUsuario)
          .order('id', { ascending: false });

        if (errT) throw errT;

        const { data: ganhadores } = await supabase.from('ganhadores').select('*');

        const meusTicketsFormatados = (tickets || []).map((t: any) => {
          let resultadoFinal: "GANHOU" | "PERDEU" | "AGUARDANDO" = "AGUARDANDO";
          const souGanhador = ganhadores?.find((g: any) => g.ticket_id === t.id);
          const sorteioJaTeveGanhador = ganhadores?.some((g: any) => g.sorteio_id === t.sorteio_id);

          if (souGanhador) resultadoFinal = "GANHOU";
          else if (sorteioJaTeveGanhador) resultadoFinal = "PERDEU";

          return {
            id: t.id,
            data: t.data,
            email: t.email,
            csgobigId: t.csgobig_id,
            coins: t.coins,
            status: t.status,
            nomeSorteio: t.sorteio?.nome || "Sorteio Removido",
            imgSorteio: t.sorteio?.img || "",
            resultado: resultadoFinal
          };
        });

        setTicketsUsuario(meusTicketsFormatados);
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarDadosGlobais();
  }, [session]);

  if (!session) return (
    <div className="min-h-screen bg-[#0f1014] flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-2xl font-black italic uppercase mb-4">Acesso Restrito</h2>
        <p className="text-slate-400 mb-6">Faça login para ver seus depósitos.</p>
        <Link href="/" className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded font-black uppercase tracking-wide transition">Voltar para Home</Link>
    </div>
  );

  const totalCoins = ticketsUsuario.reduce((acc, t) => acc + Number(t.coins), 0);

  return (
    // Fundo configurado para ler a imagem local
    <div 
        className="flex flex-col min-h-screen bg-[#0f1014] bg-cover bg-center bg-fixed"
        style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15, 16, 20, 0.85), rgba(15, 16, 20, 0.95)), url('${bgImageUrl}')`
        }}
    >
        
        {/* Espaçador da Navbar Fixa */}
        <div className="h-32 w-full flex-shrink-0"></div>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 text-white p-4 md:p-8 mb-64 min-h-[60vh]">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 border-b border-white/5 pb-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-3 bg-[#1b1e24]/80 backdrop-blur-sm rounded-lg hover:bg-white/5 border border-white/5 transition text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">Meus Depósitos 🎒</h1>
                            <p className="text-slate-400 text-sm">Histórico completo de entradas</p>
                        </div>
                    </div>
                    <div className="bg-[#1b1e24]/80 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/5 shadow-lg">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Total Acumulado</p>
                        <p className="text-yellow-500 font-black text-2xl">{totalCoins} <span className="text-sm font-normal text-white">Chances</span></p>
                    </div>
                </div>

                {carregando ? (
                    <div className="text-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                        <p className="text-slate-500 italic uppercase text-sm tracking-widest">Buscando seus tickets...</p>
                    </div>
                ) : ticketsUsuario.length > 0 ? (
                    <div className="space-y-4">
                        {ticketsUsuario.map((ticket) => (
                            <div 
                                key={ticket.id} 
                                className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between transition relative overflow-hidden gap-6 backdrop-blur-sm
                                ${ticket.resultado === "GANHOU" ? "bg-green-950/40 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]" : 
                                ticket.resultado === "PERDEU" ? "bg-[#1b1e24]/60 border-white/5 opacity-60 grayscale-[0.5]" :
                                "bg-[#1b1e24]/80 border-white/5 hover:border-yellow-500/30 hover:shadow-lg hover:shadow-black/20"}`}
                            >
                                {ticket.resultado === "GANHOU" && (
                                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                        <Trophy className="w-40 h-40 text-green-500" />
                                    </div>
                                )}

                                <div className="flex items-center gap-5 z-10">
                                    <div className="w-20 h-20 bg-[#0f1014]/50 rounded-xl p-3 border border-white/5 flex items-center justify-center flex-shrink-0 shadow-inner">
                                        <img src={ticket.imgSorteio} alt="" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div>
                                        <h4 className="font-black italic text-white text-xl uppercase tracking-tight">{ticket.nomeSorteio}</h4>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 font-mono">
                                            <span className="bg-black/30 px-2 py-1 rounded">ID: {ticket.csgobigId}</span>
                                            <span className="self-center">•</span>
                                            <span>{ticket.data}</span>
                                        </div>
                                        
                                        <div className="mt-3 inline-flex">
                                            {ticket.status === "Pendente" && <span className="px-3 py-1 rounded bg-yellow-500/10 text-yellow-500 text-[10px] font-bold border border-yellow-500/20 flex items-center gap-1.5 uppercase tracking-wide"><Clock className="w-3 h-3"/> Analisando</span>}
                                            {ticket.status === "Rejeitado" && <span className="px-3 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-bold border border-red-500/20 flex items-center gap-1.5 uppercase tracking-wide"><XCircle className="w-3 h-3"/> Rejeitado</span>}
                                            {ticket.status === "Aprovado" && <span className="px-3 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20 flex items-center gap-1.5 uppercase tracking-wide"><CheckCircle className="w-3 h-3"/> Confirmado</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-left md:text-right z-10 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-white/5 md:border-0 pt-4 md:pt-0">
                                    <span className="flex items-center gap-1 text-yellow-500 font-black bg-yellow-500/10 px-4 py-1.5 rounded text-sm mb-0 md:mb-2 border border-yellow-500/20">
                                        <Coins className="w-4 h-4" /> {ticket.coins}
                                    </span>
                                    
                                    {ticket.resultado === "GANHOU" && (
                                        <div className="flex items-center gap-2 text-green-400 font-black bg-green-500/10 px-4 py-1.5 rounded border border-green-500/20 animate-pulse text-sm uppercase italic">
                                            <Trophy className="w-4 h-4" /> VOCÊ GANHOU!
                                        </div>
                                    )}
                                    {ticket.resultado === "PERDEU" && (
                                        <div className="flex items-center gap-2 text-slate-500 font-bold bg-black/40 px-3 py-1 rounded border border-white/5 text-xs uppercase">
                                            <Ban className="w-3 h-3" /> Encerrado
                                        </div>
                                    )}
                                    {ticket.resultado === "AGUARDANDO" && ticket.status === "Aprovado" && (
                                        <div className="text-xs text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20 uppercase tracking-wide">Aguardando Sorteio...</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-[#1b1e24]/80 backdrop-blur-sm rounded-2xl border border-white/5 border-dashed">
                        <AlertCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 text-xl font-bold">Nenhum depósito encontrado.</p>
                        <p className="text-slate-600 text-sm mb-8">Participe de um sorteio para aparecer aqui.</p>
                        <Link href="/"><button className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded font-black uppercase tracking-wide transition shadow-lg shadow-yellow-500/10">Ir para Sorteios</button></Link>
                    </div>
                )}
            </div>
        </main>

        {/* RODAPÉ */}
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
                            <li><Link href="/#parceiros" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Parceiros</Link></li>
                            <li><Link href="/meus-sorteios" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Meus Tickets</Link></li>
                            <li><a href="https://twitch.tv/canaldosoares" target="_blank" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Live Stream</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold uppercase mb-6 tracking-wide text-sm">Siga-nos</h4>
                        <div className="flex gap-4">
                            <a href="https://twitch.tv/canaldosoares" target="_blank" className="w-10 h-10 bg-[#0f1014] rounded flex items-center justify-center text-slate-400 hover:bg-[#9146ff] hover:text-white transition">
                                <Twitch className="w-5 h-5"/>
                            </a>
                            <a href="https://instagram.com/seuinstead" target="_blank" className="w-10 h-10 bg-[#0f1014] rounded flex items-center justify-center text-slate-400 hover:bg-[#E1306C] hover:text-white transition">
                                <Instagram className="w-5 h-5"/>
                            </a>
                            <a href="#" className="w-10 h-10 bg-[#0f1014] rounded flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition">
                                <Youtube className="w-5 h-5"/>
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