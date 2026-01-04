"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link"; // Importante para o redirecionamento
import { X, Image as ImageIcon, Lock, Gift, CheckCircle, Trophy, History } from "lucide-react";
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

export default function Home() {
  const { data: session } = useSession();
  
  // Estados de Dados
  const [listaSorteios, setListaSorteios] = useState<Sorteio[]>([]);
  
  // Estados de UI
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
  }, []);

  const carregarSorteios = async () => {
    const { data, error } = await supabase
      .from('sorteios')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
        setListaSorteios(data);
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
        user_image: session?.user?.image,
        csgobig_id: csgobigId,
        coins: Number(qtdCoins),
        instagram: instagram,
        print: arquivoPrint,
        status: "Pendente",
        data: new Date().toLocaleString()
    }]);

    setEnviando(false);

    if (error) {
        alert("Erro ao enviar: " + error.message);
    } else {
        setModalAberto(false);
        // Redireciona o usuário para a página de Meus Sorteios após o sucesso
        if (confirm("✅ Sucesso! Deseja ver seus tickets agora?")) {
            window.location.href = "/meus-sorteios";
        }
    }
  };

  return (
    <main className="min-h-screen text-white pb-20 pt-8 bg-slate-950 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-slate-800 pb-6">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-2">🔥 SORTEIOS DO SOARES</h1>
            
            </div>
            
            <Link href="/meus-sorteios">
                <button className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg hover:border-yellow-500/50 group">
                    <History className="w-5 h-5 group-hover:text-yellow-500 transition"/> 
                    VER MEUS TICKETS
                </button>
            </Link>
        </div>

        {/* LISTA DE SORTEIOS */}
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