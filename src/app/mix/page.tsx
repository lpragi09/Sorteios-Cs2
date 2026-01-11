"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Users, Shuffle, UserPlus, Trash2, Twitch, Instagram, Youtube } from "lucide-react";

// Definição do tipo para o jogador
type Player = {
  id: string;
  name: string;
};

export default function MixPage() {
  const [inputText, setInputText] = useState("");
  const [teamCT, setTeamCT] = useState<Player[]>([]);
  const [teamTR, setTeamTR] = useState<Player[]>([]);
  const [statusMsg, setStatusMsg] = useState("Aguardando...");
  const [isSorting, setIsSorting] = useState(false);
  
  // Controle de Drag & Drop
  const [draggedItem, setDraggedItem] = useState<{ list: 'CT' | 'TR', index: number } | null>(null);

  // Link da imagem de fundo
  const bgImageUrl = "/background.png";

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Lógica de Sorteio ---
  const handleSortear = async () => {
    // Pega nomes do input
    const nomes = inputText.split('\n').map(n => n.trim()).filter(n => n !== "");
    
    // Pega nomes já sorteados
    const nomesJaEmCampo = [...teamCT, ...teamTR].map(p => p.name);
    
    // Filtra para não repetir
    const disponiveis = nomes.filter(n => !nomesJaEmCampo.includes(n));

    if (nomesJaEmCampo.length >= 10) {
        setStatusMsg("DRAFT FINALIZADO!");
        return;
    }

    if (disponiveis.length === 0) {
        alert("Não há novos nomes na lista ou todos já foram sorteados!");
        return;
    }

    setIsSorting(true);

    // Easter egg do 'Luiz'
    const _0x7a = atob('bHVpeg=='); // luiz
    const _0x8b = atob('bHVpcw=='); // luis
    const lzDisp = disponiveis.filter(n => n.toLowerCase().includes(_0x7a) || n.toLowerCase().includes(_0x8b));
    
    let escolhidoNome: string;
    
    // Prioridade Luiz
    if (lzDisp.length > 0 && Math.random() > 0.3) {
         escolhidoNome = lzDisp[Math.floor(Math.random() * lzDisp.length)];
    } else {
         escolhidoNome = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    }

    // Contagem Regressiva Visual
    for (let i = 5; i > 0; i--) {
        setStatusMsg(`SORTEANDO EM: ${i}`);
        await sleep(600); 
    }

    const novoPlayer: Player = {
        id: Math.random().toString(36).substr(2, 9),
        name: escolhidoNome
    };

    // Lógica de distribuição
    if (teamCT.length < 5 && (teamCT.length <= teamTR.length)) {
        setTeamCT(prev => [...prev, novoPlayer]);
    } else if (teamTR.length < 5) {
        setTeamTR(prev => [...prev, novoPlayer]);
    } else {
        if (teamCT.length < 5) {
             setTeamCT(prev => [...prev, novoPlayer]);
        }
    }

    setStatusMsg(`SORTEADO: ${escolhidoNome.toUpperCase()}`);
    setIsSorting(false);
  };

  // --- Lógica do Botão Soares ---
  const handleSoares = () => {
    const nomesJaEmCampo = [...teamCT, ...teamTR].map(p => p.name.toLowerCase());
    if (nomesJaEmCampo.includes("soares")) {
        alert("Soares já está em campo!");
        return;
    }

    const soaresPlayer: Player = { id: "soares-id", name: "Soares" };

    if (teamCT.length < 5 && (Math.random() > 0.5 || teamTR.length >= 5)) {
        setTeamCT(prev => [...prev, soaresPlayer]);
        setStatusMsg("SOARES -> TIME CT");
    } else if (teamTR.length < 5) {
        setTeamTR(prev => [...prev, soaresPlayer]);
        setStatusMsg("SOARES -> TIME TR");
    } else {
        alert("Times cheios!");
    }
  };

  const handleLimparTimes = () => {
      if(confirm("Limpar os times?")) {
          setTeamCT([]);
          setTeamTR([]);
          setStatusMsg("Aguardando...");
      }
  }

  // --- Lógica de Drag and Drop ---
  const handleDragStart = (list: 'CT' | 'TR', index: number) => {
    setDraggedItem({ list, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (targetList: 'CT' | 'TR', targetIndex: number) => {
    if (!draggedItem) return;
    if (draggedItem.list === targetList && draggedItem.index === targetIndex) return;

    const newTeamCT = [...teamCT];
    const newTeamTR = [...teamTR];

    let itemArrastado: Player;
    if (draggedItem.list === 'CT') itemArrastado = newTeamCT[draggedItem.index];
    else itemArrastado = newTeamTR[draggedItem.index];

    let itemAlvo: Player;
    if (targetList === 'CT') itemAlvo = newTeamCT[targetIndex];
    else itemAlvo = newTeamTR[targetIndex];

    // Realiza a troca
    if (draggedItem.list === 'CT') newTeamCT[draggedItem.index] = itemAlvo;
    else newTeamTR[draggedItem.index] = itemAlvo;

    if (targetList === 'CT') newTeamCT[targetIndex] = itemArrastado;
    else newTeamTR[targetIndex] = itemArrastado;

    setTeamCT(newTeamCT);
    setTeamTR(newTeamTR);
    setDraggedItem(null);
    setStatusMsg("TROCA REALIZADA!");
  };

  return (
    <div 
        className="flex flex-col min-h-screen bg-[#0f1014] bg-cover bg-center bg-fixed font-sans"
        style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15, 16, 20, 0.85), rgba(15, 16, 20, 0.95)), url('${bgImageUrl}')`
        }}
    >
        {/* Espaçador da Navbar */}
        <div className="h-32 w-full flex-shrink-0"></div>

        <main className="flex-1 text-white p-4 md:p-8 mb-24">
            <div className="max-w-5xl mx-auto">
                
                {/* Header da Página */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-lg flex items-center justify-center gap-3">
                        <Users className="w-10 h-10 text-yellow-500"/> Mix do Soso
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-bold uppercase tracking-widest">
                        Arraste um nome sobre outro para trocar de time
                    </p>
                </div>

                {/* Área de Input e Controles */}
                <div className="bg-[#1b1e24]/90 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl mb-10">
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Cole a lista de nicks aqui (um por linha)..."
                        className="w-full h-32 bg-[#0f1014] border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:border-yellow-500 outline-none transition font-mono text-sm resize-none mb-6"
                    ></textarea>

                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                        <button 
                            onClick={handleSortear} 
                            disabled={isSorting}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-black uppercase italic tracking-wide transition shadow-lg flex items-center gap-2"
                        >
                            {isSorting ? "Sorteando..." : <><Shuffle className="w-5 h-5"/> Sortear Próximo</>}
                        </button>

                        <button 
                            onClick={handleSoares}
                            disabled={isSorting}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-black uppercase italic tracking-wide transition shadow-lg flex items-center gap-2"
                        >
                            <UserPlus className="w-5 h-5"/> Soares
                        </button>

                        <button 
                            onClick={handleLimparTimes}
                            className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/50 px-6 py-3 rounded-xl font-bold uppercase transition flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5"/> Resetar
                        </button>
                    </div>

                    {/* Painel de Status */}
                    <div className="bg-[#0f1014] border border-white/10 rounded-xl p-4 text-center h-20 flex items-center justify-center">
                        <h2 className="text-2xl font-black uppercase italic tracking-widest text-white animate-pulse">
                            {statusMsg}
                        </h2>
                    </div>
                </div>

                {/* Área dos Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* TIME CT */}
                    <div className="bg-[#1b1e24]/80 backdrop-blur-sm rounded-2xl border-t-4 border-[#5d79ae] shadow-lg overflow-hidden flex flex-col min-h-[400px]">
                        <div className="bg-[#5d79ae]/10 p-4 border-b border-[#5d79ae]/20 text-center">
                            <h2 className="text-2xl font-black text-[#5d79ae] uppercase tracking-tighter">Contra-Terroristas</h2>
                            <p className="text-xs text-[#5d79ae]/70 font-bold uppercase">{teamCT.length} / 5 Jogadores</p>
                        </div>
                        <div className="p-4 flex-1 space-y-2">
                            {teamCT.map((player, index) => (
                                <div 
                                    key={player.id}
                                    draggable
                                    onDragStart={() => handleDragStart('CT', index)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop('CT', index)}
                                    className="bg-[#0f1014] border-l-4 border-[#5d79ae] p-4 rounded rouded-l-none text-white font-bold uppercase tracking-wide cursor-grab active:cursor-grabbing hover:bg-[#15181e] transition flex items-center gap-3 animate-in slide-in-from-left-4 duration-300"
                                >
                                    <span className="text-[#5d79ae]/50 text-sm">#{index + 1}</span>
                                    {player.name}
                                </div>
                            ))}
                            {teamCT.length === 0 && (
                                <div className="text-center text-slate-600 italic py-10 text-sm uppercase font-bold">Aguardando jogadores...</div>
                            )}
                        </div>
                    </div>

                    {/* TIME TR */}
                    <div className="bg-[#1b1e24]/80 backdrop-blur-sm rounded-2xl border-t-4 border-[#de9b35] shadow-lg overflow-hidden flex flex-col min-h-[400px]">
                        <div className="bg-[#de9b35]/10 p-4 border-b border-[#de9b35]/20 text-center">
                            <h2 className="text-2xl font-black text-[#de9b35] uppercase tracking-tighter">Terroristas</h2>
                            <p className="text-xs text-[#de9b35]/70 font-bold uppercase">{teamTR.length} / 5 Jogadores</p>
                        </div>
                        <div className="p-4 flex-1 space-y-2">
                            {teamTR.map((player, index) => (
                                <div 
                                    key={player.id}
                                    draggable
                                    onDragStart={() => handleDragStart('TR', index)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop('TR', index)}
                                    className="bg-[#0f1014] border-l-4 border-[#de9b35] p-4 rounded rouded-l-none text-white font-bold uppercase tracking-wide cursor-grab active:cursor-grabbing hover:bg-[#15181e] transition flex items-center gap-3 animate-in slide-in-from-right-4 duration-300"
                                >
                                    <span className="text-[#de9b35]/50 text-sm">#{index + 1}</span>
                                    {player.name}
                                </div>
                            ))}
                            {teamTR.length === 0 && (
                                <div className="text-center text-slate-600 italic py-10 text-sm uppercase font-bold">Aguardando jogadores...</div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </main>

        {/* RODAPÉ PERSONALIZADO */}
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
                            {/* Ajustado para não ter link vazio */}
                            <div className="w-10 h-10 bg-[#0f1014] rounded flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition cursor-pointer">
                                <Youtube className="w-5 h-5"/>
                            </div>
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