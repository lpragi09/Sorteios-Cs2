"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Coins, AlertCircle, Trophy, XCircle, Ban } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Inicialização do cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    if (!session?.user?.email) return;

    const buscarMeusDados = async () => {
      setCarregando(true);
      
      // 1. Busca todos os sorteios do banco
      const { data: sorteios } = await supabase
        .from('sorteios')
        .select('*');

      if (!sorteios) return;

      let meusTicketsAcumulados: Ticket[] = [];

      // 2. Para cada sorteio, busca os tickets do usuário e se ele ganhou
      for (const sorteio of sorteios) {
        // Busca tickets do usuário neste sorteio
        const { data: tickets } = await supabase
          .from('tickets')
          .select('*')
          .eq('sorteio_id', sorteio.id)
          .eq('email', session.user?.email);

        // Busca se houve ganhadores para este sorteio
        const { data: ganhadores } = await supabase
          .from('ganhadores')
          .select('*')
          .eq('sorteio_id', sorteio.id);

        if (tickets) {
          const processados = tickets.map((t: any) => {
            let resultadoFinal: "GANHOU" | "PERDEU" | "AGUARDANDO" = "AGUARDANDO";

            // Verifica se o ticket ID está na lista de ganhadores
            const souGanhador = ganhadores?.find((g: any) => g.ticket_id === t.id);

            if (souGanhador) {
              resultadoFinal = "GANHOU";
            } else if (ganhadores && ganhadores.length > 0) {
              resultadoFinal = "PERDEU";
            }

            return {
              id: t.id,
              data: new Date(t.data).toLocaleString(),
              email: t.email,
              csgobigId: t.csgobig_id,
              coins: t.coins,
              status: t.status,
              nomeSorteio: sorteio.nome,
              imgSorteio: sorteio.img,
              resultado: resultadoFinal
            };
          });
          meusTicketsAcumulados = [...meusTicketsAcumulados, ...processados];
        }
      }

      // Ordena: Mais recentes primeiro
      meusTicketsAcumulados.sort((a, b) => b.id - a.id);
      setTicketsUsuario(meusTicketsAcumulados);
      setCarregando(false);
    };

    buscarMeusDados();
  }, [session]);

  if (!session) return <div className="p-20 text-center text-white">Faça login para ver seus depósitos.</div>;
  if (carregando) return <div className="p-20 text-center text-white italic">Carregando seus depósitos...</div>;

  const totalCoins = ticketsUsuario.reduce((acc, t) => acc + Number(t.coins), 0);

  return (
    <main className="max-w-4xl mx-auto p-8 text-white">
        <div className="mb-8 border-b border-slate-800 pb-4">
            <h1 className="text-3xl font-bold mb-2">Meus Depósitos 🎒</h1>
            <p className="text-slate-400">Total acumulado: <span className="text-yellow-500 font-bold">{totalCoins} Chances</span></p>
        </div>

        {ticketsUsuario.length > 0 ? (
            <div className="space-y-4">
                {ticketsUsuario.map((ticket) => (
                    <div 
                        key={ticket.id} 
                        className={`p-5 rounded-xl border flex items-center justify-between transition relative overflow-hidden
                        ${ticket.resultado === "GANHOU" ? "bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : 
                          ticket.resultado === "PERDEU" ? "bg-slate-900/50 border-slate-800 opacity-75 grayscale-[0.5]" :
                          "bg-slate-900 border-slate-800 hover:border-slate-700"}`}
                    >
                        
                        {ticket.resultado === "GANHOU" && (
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Trophy className="w-32 h-32 text-green-500" />
                            </div>
                        )}

                        <div className="flex items-center gap-4 z-10">
                            <img 
                                src={ticket.imgSorteio} 
                                alt=""
                                className="w-16 h-16 object-contain bg-slate-950 rounded p-2 border border-slate-800" 
                            />
                            <div>
                                <h4 className="font-bold text-white text-lg">{ticket.nomeSorteio}</h4>
                                <p className="text-xs text-slate-500">
                                    ID: {ticket.csgobigId} • {ticket.data}
                                </p>
                                
                                {ticket.resultado === "AGUARDANDO" && (
                                    <div className="mt-2 flex items-center gap-2">
                                        {ticket.status === "Pendente" && <span className="text-yellow-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> Analisando Depósito</span>}
                                        {ticket.status === "Rejeitado" && <span className="text-red-500 text-xs flex items-center gap-1"><XCircle className="w-3 h-3"/> Depósito Rejeitado</span>}
                                        {ticket.status === "Aprovado" && <span className="text-green-500 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Confirmado</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="text-right z-10 flex flex-col items-end justify-center h-full">
                            <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-950/20 px-3 py-1 rounded text-sm mb-2">
                                <Coins className="w-4 h-4" /> {ticket.coins}
                            </span>

                            {ticket.resultado === "GANHOU" && (
                                <div className="flex items-center gap-2 text-green-400 font-black bg-green-950/50 px-4 py-2 rounded border border-green-500/50 animate-pulse">
                                    <Trophy className="w-5 h-5" /> VOCÊ GANHOU!
                                </div>
                            )}

                            {ticket.resultado === "PERDEU" && (
                                <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-950 px-3 py-1 rounded border border-slate-800">
                                    <Ban className="w-4 h-4" /> Já Sorteado
                                </div>
                            )}

                            {ticket.resultado === "AGUARDANDO" && ticket.status === "Aprovado" && (
                                <div className="text-xs text-blue-400 font-bold">
                                    Aguardando Sorteio...
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhum depósito encontrado nesta conta.</p>
                <Link href="/"><button className="mt-4 text-yellow-500 underline">Voltar para Home</button></Link>
            </div>
        )}
    </main>
  );
}