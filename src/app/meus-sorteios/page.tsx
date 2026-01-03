"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle, Clock, Coins, AlertCircle, Trophy, XCircle, Ban } from "lucide-react";

type Ticket = {
    id: number;
    data: string;
    email: string;
    csgobigId: string;
    coins: number;
    status: string;
    // Campos visuais adicionados na montagem
    nomeSorteio?: string;
    imgSorteio?: string;
    resultado?: "GANHOU" | "PERDEU" | "AGUARDANDO"; // Novo status final
};

export default function MeusSorteiosPage() {
  const { data: session } = useSession();
  const [ticketsUsuario, setTicketsUsuario] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!session?.user?.email) return;

    // 1. Pega lista de todos os sorteios
    const sorteios = JSON.parse(localStorage.getItem("lista_sorteios") || "[]");
    let meusTickets: Ticket[] = [];

    // 2. Varre cada sorteio
    sorteios.forEach((sorteio: any) => {
        // Pega os tickets deste sorteio
        const ticketsDoSorteio = JSON.parse(localStorage.getItem(`tickets_${sorteio.id}`) || "[]");
        
        // Pega a lista de GANHADORES deste sorteio
        const listaGanhadores = JSON.parse(localStorage.getItem(`ganhadores_${sorteio.id}`) || "[]");
        
        // Filtra só os tickets do usuário logado
        const meus = ticketsDoSorteio.filter((t: any) => t.email === session.user?.email);
        
        // Adiciona informações extras para exibir na tela
        const meusComInfo = meus.map((t: any) => {
            let resultadoFinal: "GANHOU" | "PERDEU" | "AGUARDANDO" = "AGUARDANDO";

            // Verifica se esse ticket específico ganhou
            const souGanhador = listaGanhadores.find((g: any) => g.ticket.id === t.id);

            if (souGanhador) {
                resultadoFinal = "GANHOU";
            } else if (listaGanhadores.length > 0) {
                // Se já tem ganhadores e eu não sou um deles...
                // Aqui depende da regra: Se for sorteio de 3 itens, pode ser que ainda role.
                // Mas para feedback visual, se já rodou a roleta, mostramos que já foi sorteado.
                resultadoFinal = "PERDEU";
            }

            return {
                ...t, 
                nomeSorteio: sorteio.nome,
                imgSorteio: sorteio.img,
                resultado: resultadoFinal
            };
        });

        meusTickets = [...meusTickets, ...meusComInfo];
    });

    // Ordena: Mais recentes primeiro
    meusTickets.sort((a, b) => b.id - a.id);

    setTicketsUsuario(meusTickets);
  }, [session]);

  if (!session) return <div className="p-20 text-center text-white">Faça login para ver seus depósitos.</div>;

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
                        
                        {/* Se ganhou, coloca um efeito de brilho no fundo */}
                        {ticket.resultado === "GANHOU" && (
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Trophy className="w-32 h-32 text-green-500" />
                            </div>
                        )}

                        <div className="flex items-center gap-4 z-10">
                            <img 
                                src={ticket.imgSorteio} 
                                className="w-16 h-16 object-contain bg-slate-950 rounded p-2 border border-slate-800" 
                            />
                            <div>
                                <h4 className="font-bold text-white text-lg">{ticket.nomeSorteio}</h4>
                                <p className="text-xs text-slate-500">
                                    ID: {ticket.csgobigId} • {ticket.data}
                                </p>
                                
                                {/* Exibe o status da validação se ainda não foi sorteado */}
                                {ticket.resultado === "AGUARDANDO" && (
                                    <div className="mt-2 flex items-center gap-2">
                                        {ticket.status === "Em análise" && <span className="text-yellow-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> Analisando Depósito</span>}
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

                            {/* STATUS FINAL DO SORTEIO */}
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