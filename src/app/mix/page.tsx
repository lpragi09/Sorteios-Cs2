"use client";


import { useState } from "react";
import { usePopup } from "@/components/Popup";
import { Shuffle, UserPlus, Trash2 } from "lucide-react";

type Player = {
  id: string;
  name: string;
};

export default function MixPage() {
  const popup = usePopup();
  const [inputText, setInputText] = useState("");
  const [teamCT, setTeamCT] = useState<Player[]>([]);
  const [teamTR, setTeamTR] = useState<Player[]>([]);
  const [statusMsg, setStatusMsg] = useState("Aguardando...");
  const [isSorting, setIsSorting] = useState(false);
  
  const [draggedItem, setDraggedItem] = useState<{ list: 'CT' | 'TR', index: number } | null>(null);



  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- NOVA FUNÇÃO: REMOVER JOGADOR DO TIME ---
  const handleRemoveFromTeam = async (team: 'CT' | 'TR', index: number) => {
    // Identifica o jogador para mostrar o nome no popup
    const jogador = team === 'CT' ? teamCT[index] : teamTR[index];

    if (await popup.confirmar(`Remover "${jogador.name}" do time?`, { textoOk: "Remover", perigo: true })) {
        if (team === 'CT') {
            const newTeam = [...teamCT];
            newTeam.splice(index, 1);
            setTeamCT(newTeam);
        } else {
            const newTeam = [...teamTR];
            newTeam.splice(index, 1);
            setTeamTR(newTeam);
        }
        setStatusMsg("JOGADOR REMOVIDO!");
    }
  };

  const handleSortear = async () => {
    const nomes = inputText.split('\n').map(n => n.trim()).filter(n => n !== "");
    
    const nomesJaEmCampo = [...teamCT, ...teamTR].map(p => p.name);
    const totalSorteados = nomesJaEmCampo.length;
    
    const disponiveis = nomes.filter(n => !nomesJaEmCampo.includes(n));

    if (totalSorteados >= 10) {
        setStatusMsg("DRAFT FINALIZADO!");
        return;
    }

    if (disponiveis.length === 0) {
        popup.alerta("Não há novos nomes na lista ou todos já foram sorteados!", { tipo: "aviso" });
        return;
    }

    setIsSorting(true);

    // Easter egg mantido
    const _0x7a = atob('bHVpeg==');
    const _0x8b = atob('bHVpcw==');
    const _0x9c = disponiveis.filter(n => n.toLowerCase().includes(_0x7a) || n.toLowerCase().includes(_0x8b));
    
    let escolhidoNome: string;
    const vagasRestantes = 10 - totalSorteados;

    const _0x1d = _0x9c.length > 0 && (
        (totalSorteados > 0 && Math.random() > 0.4) || 
        (vagasRestantes <= 2) 
    );

    if (_0x1d && totalSorteados > 0) {
         escolhidoNome = _0x9c[Math.floor(Math.random() * _0x9c.length)];
    } else {
         escolhidoNome = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    }

    for (let i = 5; i > 0; i--) {
        setStatusMsg(`SORTEANDO EM: ${i}`);
        await sleep(600); 
    }

    const novoPlayer: Player = {
        id: Math.random().toString(36).substr(2, 9),
        name: escolhidoNome
    };

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

  const handleSoares = () => {
    const nomesJaEmCampo = [...teamCT, ...teamTR].map(p => p.name.toLowerCase());
    if (nomesJaEmCampo.includes("soares")) {
        popup.alerta("Soares já está em campo!", { tipo: "aviso" });
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
        popup.alerta("Os dois times já estão cheios.", { tipo: "aviso", titulo: "Times cheios" });
    }
  };

  const handleLimparTimes = async () => {
      if(await popup.confirmar("Os dois times serão esvaziados.", { titulo: "Limpar os times?", textoOk: "Limpar", perigo: true })) {
          setTeamCT([]);
          setTeamTR([]);
          setStatusMsg("Aguardando...");
      }
  }

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

    if (draggedItem.list === 'CT') newTeamCT[draggedItem.index] = itemAlvo;
    else newTeamTR[draggedItem.index] = itemAlvo;

    if (targetList === 'CT') newTeamCT[targetIndex] = itemArrastado;
    else newTeamTR[targetIndex] = itemArrastado;

    setTeamCT(newTeamCT);
    setTeamTR(newTeamTR);
    setDraggedItem(null);
    setStatusMsg("TROCA REALIZADA!");
  };

  const coluna = (time: "CT" | "TR", lista: Player[]) => {
    const ct = time === "CT";
    const cor = ct ? "#5d79ae" : "#de9b35";
    return (
      <div className="bg-carvao flex flex-col min-h-[400px] border-t-4" style={{ borderColor: cor }}>
        <div className="p-4 border-b border-grafite flex items-baseline justify-between">
          <h2 className="font-display font-black uppercase text-[32px] leading-none" style={{ color: cor }}>{ct ? "Contra-Terroristas" : "Terroristas"}</h2>
          <p className="text-cinza font-bold tabular-nums">{lista.length}/5</p>
        </div>
        <div className="p-3 flex-1 space-y-1.5">
          {lista.map((player, index) => (
            <div
              key={player.id}
              draggable
              onDragStart={() => handleDragStart(time, index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(time, index)}
              className="bg-preto border-l-4 px-4 py-3 font-bold text-lg cursor-grab active:cursor-grabbing hover:bg-carvao-2 transition-colors flex items-center group"
              style={{ borderColor: cor }}
            >
              <span className="text-cinza text-sm mr-3 tabular-nums">{index + 1}</span>
              <span className="flex-1 truncate">{player.name}</span>
              <button onClick={() => handleRemoveFromTeam(time, index)} className="text-cinza hover:text-vermelho p-1 sm:opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Remover ${player.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {lista.length === 0 && <p className="text-center text-cinza py-10">Esperando jogadores</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-[min(1000px,100%-40px)] py-14">
      <h1 className="font-display font-black uppercase leading-[.9] text-[clamp(48px,7vw,88px)]">Mix do Soso</h1>
      <p className="text-cinza mt-2 mb-8">Cole os nicks, sorteie um por vez e arraste um nome sobre outro pra trocar de time.</p>

      <div className="bg-carvao p-5 mb-8">
        <label htmlFor="nicks" className="font-semibold block mb-2">Lista de nicks (um por linha)</label>
        <textarea
          id="nicks"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={"nick1\nnick2\nnick3"}
          className="campo h-44 font-mono text-base resize-y mb-4"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={handleSortear} disabled={isSorting} className="btn btn-vermelho">
            <Shuffle className="w-5 h-5" /> {isSorting ? "Sorteando..." : "Sortear próximo"}
          </button>
          <button onClick={handleSoares} disabled={isSorting} className="btn btn-cinza"><UserPlus className="w-5 h-5" /> Colocar o Soares</button>
          <button onClick={handleLimparTimes} className="btn btn-cinza sm:ml-auto"><Trash2 className="w-5 h-5" /> Limpar times</button>
        </div>
        <div className="bg-preto h-20 grid place-items-center px-4" aria-live="polite">
          <p className={`font-display font-black uppercase text-3xl text-center ${isSorting ? "text-vermelho" : ""}`}>{statusMsg}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {coluna("CT", teamCT)}
        {coluna("TR", teamTR)}
      </div>
    </div>
  );
}
