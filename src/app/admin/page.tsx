"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Shield, Users, Gift, CheckCircle, XCircle, ExternalLink, Plus, 
  Pencil, X, Upload, Trash2, Coins, BarChart3, Trophy, RefreshCw, 
  Lock, Unlock, TrendingUp, Sparkles, Zap 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
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
    created_at: string;
    csgobig_id: string;
    coins: number;
    instagram: string;
    print_url: string;
    status: string;
    email?: string; 
    user_image?: string; 
    sorteio_id: string;
};

type Ganhador = {
    round: number;
    ticket: Ticket;
    dataGanhou: string;
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
  const [statsDetalhadas, setStatsDetalhadas] = useState<Record<string, { entries: number, coins: number }>>({});

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [ticketEmEdicao, setTicketEmEdicao] = useState<Ticket | null>(null);
  const [sorteioEmEdicao, setSorteioEmEdicao] = useState<Sorteio | null>(null);

  const [modalSorteioAberto, setModalSorteioAberto] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [ganhadorRevelado, setGanhadorRevelado] = useState<Ticket | null>(null);
  const [participanteFake, setParticipanteFake] = useState<Ticket | null>(null);
  const [listaGanhadores, setListaGanhadores] = useState<Ganhador[]>([]);

  const [formNome, setFormNome] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formValor, setFormValor] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.email !== ADMIN_EMAIL) {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    carregarDadosSupabase();
  }, [status, session, router]);

  const carregarDadosSupabase = async () => {
    // 1. Carrega Sorteios do LocalStorage (Gerenciamento de Skins)
    const salvos = localStorage.getItem("lista_sorteios");
    const sorteios: Sorteio[] = JSON.parse(salvos || "[]");
    setListaSorteios(sorteios);

    // 2. Busca estatísticas reais no Supabase
    const { data: allTickets, error } = await supabase.from('tickets').select('*');
    if (!error && allTickets) {
      const statsTemp: Record<string, { entries: number, coins: number }> = {};
      allTickets.forEach((t: Ticket) => {
        if (!statsTemp[t.sorteio_id]) statsTemp[t.sorteio_id] = { entries: 0, coins: 0 };
        statsTemp[t.sorteio_id].entries++;
        statsTemp[t.sorteio_id].coins += t.coins;
      });
      setStatsDetalhadas(statsTemp);
    }
  };

  const abrirSorteio = async (sorteio: Sorteio) => {
    setSorteioSelecionado(sorteio);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('sorteio_id', sorteio.id);
    
    if (!error) setTicketsDoSorteio(data || []);
  };

  const validarTicket = async (id: number, novoStatus: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: novoStatus })
      .eq('id', id);

    if (!error) {
      setTicketsDoSorteio(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t));
      carregarDadosSupabase();
    }
  };

  // --- LÓGICA DO SORTEIO (REVEAL) ---
  const iniciarSorteio = () => {
    if (!sorteioSelecionado) return;
    const candidatos = ticketsDoSorteio.filter(t => t.status === "Aprovado");

    if (candidatos.length === 0) { alert("Nenhum participante aprovado disponível!"); return; }

    setModalSorteioAberto(true);
    setSorteando(true);
    setGanhadorRevelado(null);

    // Seleção baseada em peso (coins)
    const totalCoins = candidatos.reduce((acc, t) => acc + t.coins, 0);
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
      if (interacoes < 40) {
        setTimeout(loopSorteio, 100);
      } else {
        setSorteando(false);
        setGanhadorRevelado(vencedorReal);
        const novoG = { round: listaGanhadores.length + 1, ticket: vencedorReal, dataGanhou: new Date().toLocaleString() };
        setListaGanhadores([...listaGanhadores, novoG]);
      }
    };
    loopSorteio();
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-black text-white flex items-center gap-2"><Shield className="text-yellow-500" /> PAINEL ADMIN</h1>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => { setAbaAtiva("dashboard"); setSorteioSelecionado(null); }} className={`flex-1 md:flex-none px-4 py-2 rounded font-bold transition ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-slate-800 text-slate-400"}`}>Visão Geral</button>
                <button onClick={() => setAbaAtiva("sorteios")} className={`flex-1 md:flex-none px-4 py-2 rounded font-bold transition ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-slate-800 text-slate-400"}`}>Sorteios</button>
            </div>
        </div>

        {/* ... (O restante do seu HTML visual permanece igual, apenas substitua as chamadas de tickets pelas novas funções) ... */}
        {/* Lembre-se de adicionar alt="" nas imagens para evitar o erro de build: <img src={...} alt="" /> */}

        {/* Exemplo de correção de botão no loop de tickets */}
        {abaAtiva === "sorteios" && sorteioSelecionado && (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <tbody className="divide-y divide-slate-800">
                        {ticketsDoSorteio.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-800/50">
                                <td className="p-4">{t.instagram}</td>
                                <td className="p-4">
                                    <button onClick={() => validarTicket(t.id, "Aprovado")} className="p-2 bg-green-600 rounded mr-2"><CheckCircle size={16}/></button>
                                    <button onClick={() => validarTicket(t.id, "Rejeitado")} className="p-2 bg-red-600 rounded"><XCircle size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        )}
      </div>
    </main>
  );
}