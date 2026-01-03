"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Lock } from "lucide-react";

type Sorteio = {
    id: string;
    nome: string;
    img: string;
    valor: string;
    status: string;
};

export default function Home() {
  const { data: session } = useSession();
  const [listaSorteios, setListaSorteios] = useState<Sorteio[]>([]);
  const [sorteioSelecionado, setSorteioSelecionado] = useState<Sorteio | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  
  const [csgobigId, setCsgobigId] = useState("");
  const [qtdCoins, setQtdCoins] = useState("");
  const [instagram, setInstagram] = useState("");
  const [arquivoPrint, setArquivoPrint] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
    window.addEventListener("focus", carregarDados);
    return () => window.removeEventListener("focus", carregarDados);
  }, []);

  const carregarDados = () => {
    const salvos = typeof window !== "undefined" ? localStorage.getItem("lista_sorteios") : null;
    if (salvos) {
        setListaSorteios(JSON.parse(salvos));
    } else {
        const padrao: Sorteio[] = [{ 
            id: "ak47", 
            nome: "AK-47 | Redline", 
            img: "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvN0_rTKQXw/360fx360f",
            valor: "150,00",
            status: "Ativo"
        }];
        setListaSorteios(padrao);
        localStorage.setItem("lista_sorteios", JSON.stringify(padrao));
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

  const confirmarParticipacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csgobigId || !qtdCoins || !instagram || !arquivoPrint || !sorteioSelecionado) {
      alert("Preencha todos os dados!");
      return;
    }

    const chaveStorage = `tickets_${sorteioSelecionado.id}`;
    const ticketsAtuais = JSON.parse(localStorage.getItem(chaveStorage) || "[]");

    const novoTicket = {
        id: Date.now(),
        data: new Date().toLocaleString(),
        email: session?.user?.email,
        userImage: session?.user?.image,
        csgobigId,
        coins: Number(qtdCoins),
        instagram,
        print: arquivoPrint,
        status: "Em análise"
    };

    localStorage.setItem(chaveStorage, JSON.stringify([...ticketsAtuais, novoTicket]));
    setModalAberto(false);
    alert(`✅ Sucesso! Você entrou no sorteio.`);
  };

  return (
    <main className="min-h-screen text-white pb-20 pt-10 bg-slate-950">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold mb-2 text-center md:text-left">Sorteios Ativossssssssss 🔥</h1>
        <p className="text-slate-400 mb-8 text-center md:text-left">Escolha uma skin e participe.</p>
        
        <div className={listaSorteios.length === 1 ? "flex justify-center" : "grid grid-cols-1 md:grid-cols-2 gap-8"}>
            {listaSorteios.map((sorteio) => (
                <div key={sorteio.id} className={`bg-slate-900 rounded-2xl border overflow-hidden flex flex-col transition relative group ${listaSorteios.length === 1 ? "w-full max-w-4xl" : "w-full"} ${sorteio.status === "Finalizado" ? "border-red-900/50 opacity-90" : "border-slate-800 hover:border-yellow-500/50"}`}>
                    
                    <div className="absolute top-6 right-6 z-10">
                        {sorteio.status === "Ativo" ? (
                            <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-xl">
                                <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">Status</span>
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

                    <div className="bg-slate-800/50 p-8 flex items-center justify-center relative h-72">
                        <img src={sorteio.img} alt="" className={`max-h-full drop-shadow-2xl transition duration-500 ${sorteio.status === "Ativo" ? "hover:scale-110" : "grayscale"}`} />
                    </div>

                    <div className="p-8 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-6">
                            <div><h2 className="text-3xl font-black text-white">{sorteio.nome}</h2><p className="text-green-400 font-bold text-lg mt-1">Valor: R$ {sorteio.valor}</p></div>
                        </div>
                        <div className="mt-auto">
                            {sorteio.status === "Ativo" ? (
                                <>
                                    <button onClick={() => abrirModal(sorteio)} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl transition shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 transform active:scale-95">PARTICIPAR AGORA 🎟️</button>
                                    <p className="text-center text-slate-500 text-xs mt-3">1 Coin depositado = 1 Chance de ganhar</p>
                                </>
                            ) : (
                                <>
                                    <button disabled className="w-full py-4 bg-slate-800 text-slate-500 font-bold text-xl rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border border-slate-700">SORTEIO FINALIZADO <Lock className="w-5 h-5"/></button>
                                    <p className="text-center text-slate-600 text-xs mt-3">Aguarde o próximo sorteio.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {modalAberto && sorteioSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 relative animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                <button onClick={() => setModalAberto(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
                <h3 className="font-bold text-lg mb-1 flex gap-2 items-center text-yellow-500">Depósito: {sorteioSelecionado.nome}</h3>
                <form onSubmit={confirmarParticipacao} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1 font-bold">ID CSGOBIG</label><input type="text" placeholder="ID..." value={csgobigId} onChange={e=>setCsgobigId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white outline-none focus:border-yellow-500"/></div>
                        <div><label className="text-xs text-slate-400 ml-1 font-bold text-yellow-500">Coins</label><input type="number" placeholder="50" value={qtdCoins} onChange={e=>setQtdCoins(e.target.value)} className="w-full bg-slate-950 border border-yellow-500/50 rounded p-3 text-white outline-none focus:border-yellow-500 font-bold"/></div>
                    </div>
                    <div><label className="text-xs text-slate-400 ml-1 font-bold">Instagram</label><input type="text" placeholder="@seu.insta" value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white outline-none focus:border-yellow-500"/></div>
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer relative hover:bg-slate-800 transition group">
                        <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {arquivoPrint ? (
                            <div className="flex flex-col items-center">
                                <img src={arquivoPrint} alt="" className="h-24 rounded mb-2 border border-slate-600 object-cover"/>
                                <span className="text-green-400 text-xs font-bold">Print Carregado!</span>
                            </div>
                        ) : (
                            <><ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2"/><span className="text-slate-400 text-sm font-bold">Enviar Comprovante</span></>
                        )}
                    </div>
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-lg font-bold text-white transition shadow-lg text-lg">ENVIAR</button>
                </form>
            </div>
        </div>
      )}
    </main>
  );
}
