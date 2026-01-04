"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Coins, AlertCircle, Trophy, XCircle, Ban, ArrowLeft } from "lucide-react";
// CORREÇÃO AQUI: Usando caminho relativo para garantir que encontre o arquivo
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

  useEffect(() => {
    // Se não tiver email, não faz nada
    if (!session?.user?.email) {
      setCarregando(false);
      return;
    }

    const buscarDadosGlobais = async () => {
      try {
        setCarregando(true);
        
        // CORREÇÃO AQUI: O uso do ?. (interrogação) evita o erro do TypeScript
        const emailUsuario = session?.user?.email || "";

        const { data: tickets, error: errT } = await supabase
          .from('tickets')
          .select(`
            *,
            sorteio:sorteios ( id, nome, img, status )
          `)
          .eq('email', emailUsuario) // Usando a variável segura criada acima
          .order('id', { ascending: false });

        if (errT) throw errT;

        const { data: ganhadores } = await supabase.from('ganhadores').select('*');

        const meusTicketsFormatados = (tickets || []).map((t: any) => {
          let resultadoFinal: "GANHOU" | "PERDEU" | "AGUARDANDO" = "AGUARDANDO";

          const souGanhador = ganhadores?.find((g: any) => g.ticket_id === t.id);
          const sorteioJaTeveGanhador = ganhadores?.some((g: any) => g.sorteio_id === t.sorteio_id);

          if (souGanhador) {
            resultadoFinal = "GANHOU";
          } else if (sorteioJaTeveGanhador) {
            resultadoFinal = "PERDEU";
          }

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-xl font-bold mb-4">Acesso Restrito</h2>
        <p className="text-slate-400 mb-6">Faça login para ver seus depósitos.</p>
        <Link href="/" className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold">Voltar para Home</Link>
    </div>
  );

  const totalCoins = ticketsUsuario.reduce((acc, t) => acc + Number(t.coins), 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition"><ArrowLeft className="w-5 h-5"/></Link>
                    <div>
                        <h1 className="text-3xl font-bold">Meus Depósitos 🎒</h1>
                        <p className="text-slate-400 text-sm">Histórico completo de entradas</p>
                    </div>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 uppercase font-bold">Total Acumulado</p>
                    <p className="text-yellow-500 font-black text-xl">{totalCoins} <span className="text-sm font-normal text-white">Chances</span></p>
                </div>
            </div>

            {carregando ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 italic">Buscando seus tickets...</p>
                </div>
            ) : ticketsUsuario.length > 0 ? (
                <div className="space-y-4">
                    {ticketsUsuario.map((ticket) => (
                        <div 
                            key={ticket.id} 
                            className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between transition relative overflow-hidden gap-4
                            ${ticket.resultado === "GANHOU" ? "bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : 
                              ticket.resultado === "PERDEU" ? "bg-slate-900/50 border-slate-800 opacity-60 grayscale-[0.5]" :
                              "bg-slate-900 border-slate-800 hover:border-slate-700"}`}
                        >
                            {ticket.resultado === "GANHOU" && (
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                    <Trophy className="w-32 h-32 text-green-500" />
                                </div>
                            )}

                            <div className="flex items-center gap-4 z-10">
                                <div className="w-16 h-16 bg-slate-950 rounded-xl p-2 border border-slate-800 flex items-center justify-center flex-shrink-0">
                                    <img src={ticket.imgSorteio} alt="" className="max-w-full max-h-full object-contain" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg leading-tight">{ticket.nomeSorteio}</h4>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-mono">
                                        <span>ID: {ticket.csgobigId}</span>
                                        <span>•</span>
                                        <span>{ticket.data}</span>
                                    </div>
                                    
                                    <div className="mt-2 inline-flex">
                                        {ticket.status === "Pendente" && <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20 flex items-center gap-1"><Clock className="w-3 h-3"/> Analisando</span>}
                                        {ticket.status === "Rejeitado" && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejeitado</span>}
                                        {ticket.status === "Aprovado" && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Confirmado</span>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-left md:text-right z-10 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-slate-800 md:border-0 pt-4 md:pt-0">
                                <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-950/20 px-3 py-1 rounded text-sm mb-0 md:mb-2 border border-yellow-500/10">
                                    <Coins className="w-4 h-4" /> {ticket.coins}
                                </span>
                                
                                {ticket.resultado === "GANHOU" && (
                                    <div className="flex items-center gap-2 text-green-400 font-black bg-green-950/50 px-4 py-1.5 rounded border border-green-500/50 animate-pulse text-sm">
                                        <Trophy className="w-4 h-4" /> VOCÊ GANHOU!
                                    </div>
                                )}
                                {ticket.resultado === "PERDEU" && (
                                    <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-950 px-3 py-1 rounded border border-slate-800 text-xs">
                                        <Ban className="w-3 h-3" /> Encerrado
                                    </div>
                                )}
                                {ticket.resultado === "AGUARDANDO" && ticket.status === "Aprovado" && (
                                    <div className="text-xs text-blue-400 font-bold bg-blue-900/10 px-2 py-1 rounded border border-blue-500/20">Aguardando Sorteio...</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                    <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-lg">Nenhum depósito encontrado.</p>
                    <p className="text-slate-600 text-sm mb-6">Participe de um sorteio para aparecer aqui.</p>
                    <Link href="/"><button className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition">Ir para Sorteios</button></Link>
                </div>
            )}
        </div>
    </main>
  );
}