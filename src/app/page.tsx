"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Lock, History, Gift, CheckCircle, Clock, XCircle, Trophy } from "lucide-react";
// MUDANÇA: Usando o cliente centralizado que criamos
import { createClient } from "@/lib/supabaseClient";

// Inicialização do cliente Supabase
const supabase = createClient();

type Sorteio = {
    id: string;
    nome: string;
    img: string;
    valor: string;
    status: string;
};

type Ticket = {
    id: number;
    data: string;
    csgobig_id: string;
    coins: number;
    status: string;
    sorteio_id: string;
    sorteio?: Sorteio; // Para join manual se precisar
};

export default function Home() {
  const { data: session } = useSession();
  
  // Estados de Dados
  const [listaSorteios, setListaSorteios] = useState<Sorteio[]>([]);
  const [meusTickets, setMeusTickets] = useState<Ticket[]>([]);
  
  // Estados de UI
  const [abaAtiva, setAbaAtiva] = useState<"sorteios" | "historico">("sorteios");
  const [sorteioSelecionado, setSorteioSelecionado] = useState<Sorteio | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  
  // Formulário
  const [csgobigId, setCsgobigId] = useState("");
  const [qtdCoins, setQtdCoins] = useState("");
  const [instagram, setInstagram] = useState("");
  const [arquivoPrint, setArquivoPrint] = useState<string | null>(null);

  useEffect(() => {
    carregarSorteios();
    
    // Se o usuário estiver logado, carrega o histórico dele
    if (session?.user?.email) {
        carregarMeusTickets();
    }
  }, [session, abaAtiva]);

  const carregarSorteios = async () => {
    const { data, error } = await supabase
      .from('sorteios')
      .select('*')
      .order('id', { ascending: false }); // Ordena para novos aparecerem primeiro

    if (!error && data) {
        setListaSorteios(data);
    }
  };

  const carregarMeusTickets = async () => {
    if (!session?.user?.email) return;

    // Busca os tickets do usuário + dados do sorteio relacionado
    const { data, error } = await supabase
        .from('tickets')
        .select(`
            *,
            sorteio:sorteios (nome, img, status)
        `)
        .eq('email', session.user.email)
        .order('id', { ascending: false });

    if (!error && data) {
        setMeusTickets(data as any);
    }
  };

  const abrirModal = (sorteio: Sorteio) => {
    if (sorteio.status === "Finalizado") return;
    if (!session) { signIn("google"); return; }
    setSorteioSelecionado(sorteio);
    setCsgobigId(""); setQtdCoins(""); setInstagram(""); setArquivoPrint(null);
    setModalAberto(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setArquivoPrint(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const confirmarParticipacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csgobigId || !qtdCoins || !instagram || !arquivoPrint || !sorteioSelecionado) {
      alert("Preencha todos os dados!");
      return;
    }

    setEnviando(true);

    const { error } = await supabase.from('tickets').insert([{
        sorteio_id: sorteioSelecionado.id,
        email: session?.user?.email,
        user_image: session?.user?.image, // Atenção: no banco é user_image (snake_case)
        csgobig_id: csgobigId,
        coins: Number(qtdCoins),
        instagram: instagram,
        print: arquivoPrint, // No banco chamamos de 'print'
        status: "Pendente",
        data: new Date().toLocaleString()
    }]);

    setEnviando(false);

    if (error) {
        alert("Erro ao enviar: " + error.message);
    } else {
        setModalAberto(false);
        alert(`✅ Sucesso! Sua participação na ${sorteioSelecionado.nome} foi enviada.`);
        // Atualiza a lista de tickets do usuário imediatamente
        carregarMeusTickets();
        setAbaAtiva("historico"); // Leva o usuário para ver o ticket criado
    }
  };

  return (
    <main className="min-h-screen text-white pb-20 pt-8 bg-slate-950 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER / ABAS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-2">🔥 SORTEIOS CSGOBIG</h1>
                <p className="text-slate-400 text-sm">Participe e ganhe skins exclusivas.</p>
            </div>
            
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button 
                    onClick={() => setAbaAtiva("sorteios")}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
                >
                    <Gift className="w-4 h-4"/> SORTEIOS
                </button>
                <button 
                    onClick={() => {
                        if(!session) signIn("google");
                        else setAbaAtiva("historico");
                    }}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${abaAtiva === "historico" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
                >
                    <History className="w-4 h-4"/> MEUS TICKETS
                </button>
            </div>
        </div>

        {/* --- ABA: LISTA DE SORTEIOS --- */}
        {abaAtiva === "sorteios" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {listaSorteios.length === 0 ? (
                     <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-slate-500">Nenhum sorteio ativo no momento.</h3>
                        <p className="text-slate-600">Fique atento ao nosso Instagram!</p>
                     </div>
                ) : (
                    <div className={listaSorteios.length === 1 ? "flex justify-center" : "grid grid-cols-1 md:grid-cols-2 gap-8"}>
                        {listaSorteios.map((sorteio) => (
                            <div key={sorteio.id} className={`bg-slate-900 rounded-2xl border overflow-hidden flex flex-col transition relative group ${listaSorteios.length === 1 ? "w-full max-w-4xl" : "w-full"} ${sorteio.status === "Finalizado" ? "border-red-900/50 opacity-90" : "border-slate-800 hover:border-yellow-500/50"}`}>
                                
                                {/* Badge de Status */}
                                <div className="absolute top-6 right-6 z-10">
                                    {sorteio.status === "Ativo" ? (
                                        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-xl">
                                            <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">Online</span>
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_#22c55e]"></span>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-red-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 shadow-xl">
                                            <span className="text-xs text-white font-bold uppercase tracking-widest">ENCERRADO</span>
                                            <Lock className="w-4 h-4 text-white"/>
                                        </div>
                                    )}
                                </div>

                                {/* Imagem */}
                                <div className="bg-slate-800/50 p-8 flex items-center justify-center relative h-72">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)]"></div>
                                    <img src={sorteio.img} alt="Skin do Sorteio" className={`max-h-full drop-shadow-2xl transition duration-500 ${sorteio.status === "Ativo" ? "hover:scale-110" : "grayscale opacity-50"}`} />
                                </div>

                                {/* Conteúdo */}
                                <div className="p-8 flex flex-col flex-1 bg-gradient-to-b from-slate-900 to-slate-950">
                                    <div className="mb-6">
                                        <h2 className="text-3xl font-black text-white">{sorteio.nome}</h2>
                                        <p className="text-green-400 font-bold text-lg mt-1 flex items-center gap-2">
                                            <span className="bg-green-900/30 px-2 py-0.5 rounded text-sm border border-green-800">VALOR</span>
                                            R$ {sorteio.valor}
                                        </p>
                                    </div>
                                    <div className="mt-auto">
                                        {sorteio.status === "Ativo" ? (
                                            <>
                                                <button onClick={() => abrirModal(sorteio)} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl transition shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 transform active:scale-95 group-hover:scale-[1.02]">
                                                    PARTICIPAR AGORA 🎟️
                                                </button>
                                                <p className="text-center text-slate-500 text-xs mt-3 font-medium">1 Coin depositado = 1 Chance de ganhar</p>
                                            </>
                                        ) : (
                                            <>
                                                <button disabled className="w-full py-4 bg-slate-800 text-slate-500 font-bold text-xl rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border border-slate-700">
                                                    SORTEIO FINALIZADO <Lock className="w-5 h-5"/>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- ABA: MEUS TICKETS (HISTÓRICO) --- */}
        {abaAtiva === "historico" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {!session ? (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-bold mb-4">Faça login para ver seu histórico</h2>
                        <button onClick={() => signIn("google")} className="bg-white text-black px-6 py-3 rounded-full font-bold">Entrar com Google</button>
                    </div>
                ) : meusTickets.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <History className="w-16 h-16 text-slate-600 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-slate-500">Você ainda não participou de nada.</h3>
                        <p className="text-slate-600 mb-6">Participe de um sorteio ativo para começar!</p>
                        <button onClick={() => setAbaAtiva("sorteios")} className="bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold">Ver Sorteios</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {meusTickets.map((ticket) => (
                            <div key={ticket.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-600 transition relative overflow-hidden group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-slate-950 rounded-xl p-2 border border-slate-800 flex items-center justify-center">
                                        <img src={(ticket as any).sorteio?.img} className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg leading-tight">{(ticket as any).sorteio?.nome}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{ticket.data}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 text-sm bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">ID CSGOBIG:</span>
                                        <span className="text-white font-mono">{ticket.csgobig_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Depósito:</span>
                                        <span className="text-yellow-500 font-bold">{ticket.coins} Coins</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 
                                        ${ticket.status === "Aprovado" ? "bg-green-900/30 text-green-400 border-green-800" : 
                                          ticket.status === "Rejeitado" ? "bg-red-900/30 text-red-400 border-red-800" : 
                                          "bg-yellow-900/30 text-yellow-500 border-yellow-800"}`}>
                                        
                                        {ticket.status === "Aprovado" && <CheckCircle className="w-3 h-3"/>}
                                        {ticket.status === "Rejeitado" && <XCircle className="w-3 h-3"/>}
                                        {ticket.status === "Pendente" && <Clock className="w-3 h-3"/>}
                                        {ticket.status.toUpperCase()}
                                    </div>
                                    {(ticket as any).sorteio?.status === "Finalizado" && (
                                        <span className="text-[10px] text-slate-600 font-bold uppercase">Sorteio Encerrado</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* --- MODAL DE PARTICIPAÇÃO --- */}
      {modalAberto && sorteioSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 relative animate-in zoom-in-95 overflow-y-auto max-h-[90vh] shadow-2xl">
                <button onClick={() => setModalAberto(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition"><X /></button>
                
                <h3 className="font-bold text-lg mb-1 flex gap-2 items-center text-white">
                    <Gift className="text-yellow-500"/> Confirmar Entrada
                </h3>
                <p className="text-xs text-slate-400 mb-6">Você está participando do sorteio: <span className="text-white font-bold">{sorteioSelecionado.nome}</span></p>

                <form onSubmit={confirmarParticipacao} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">ID CSGOBIG</label>
                            <input type="text" placeholder="Seu ID..." required value={csgobigId} onChange={e=>setCsgobigId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-yellow-500 mb-1 block">Qtd. Coins</label>
                            <input type="number" placeholder="Ex: 50" required value={qtdCoins} onChange={e=>setQtdCoins(e.target.value)} className="w-full bg-slate-950 border border-yellow-500/30 rounded-lg p-3 text-yellow-500 outline-none focus:border-yellow-500 font-black transition"/>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Instagram (Para contato)</label>
                        <input type="text" placeholder="@seu.usuario" required value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition"/>
                    </div>
                    
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Comprovante de Envio</label>
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer relative hover:bg-slate-800 hover:border-slate-500 transition group bg-slate-950/50">
                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            {arquivoPrint ? (
                                <div className="flex items-center gap-4">
                                    <img src={arquivoPrint} alt="Preview" className="h-16 w-16 rounded object-cover border border-slate-600"/>
                                    <div className="text-left">
                                        <p className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Imagem Carregada</p>
                                        <p className="text-slate-500 text-[10px]">Clique para trocar</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-2">
                                    <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2 group-hover:text-white transition"/>
                                    <span className="text-slate-400 text-xs font-bold group-hover:text-white">Clique para enviar print</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={enviando || !arquivoPrint} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-white transition shadow-lg shadow-green-900/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-95">
                        {enviando ? "ENVIANDO DADOS..." : "CONFIRMAR PARTICIPAÇÃO"}
                    </button>
                </form>
            </div>
        </div>
      )}
    </main>
  );
}