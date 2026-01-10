"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import { X, Image as ImageIcon, Lock, Gift, CheckCircle, Trophy, Twitch, Instagram, Youtube, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

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
  const [listaSorteios, setListaSorteios] = useState<Sorteio[]>([]);
  const [sorteioSelecionado, setSorteioSelecionado] = useState<Sorteio | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  
  const [csgobigId, setCsgobigId] = useState("");
  const [qtdCoins, setQtdCoins] = useState("");
  const [instagram, setInstagram] = useState("");
  const [arquivoPrint, setArquivoPrint] = useState<string | null>(null);

  useEffect(() => {
    carregarSorteios();
  }, []);

  // --- FUNÇÃO PARA ROLAGEM SUAVE (NOVO) ---
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, id: string) => {
    e.preventDefault(); // Impede o "pulo" instantâneo
    
    if (id === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 100; // Compensação da Navbar fixa
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    }
  };

  const carregarSorteios = async () => {
    const { data, error } = await supabase
      .from('sorteios')
      .select('*')
      .order('id', { ascending: false });
    if (!error && data) setListaSorteios(data);
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
        if (confirm("✅ Sucesso! Deseja ver seus tickets agora?")) window.location.href = "/meus-sorteios";
    }
  };

  return (
    <main className="text-white bg-[#0f1014]">
      
      {/* SEÇÃO 1: SORTEIOS */}
      <div className="min-h-screen flex flex-col pt-32 px-4 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          
          <div className="text-center mb-16 space-y-4">
             <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter flex items-center justify-center gap-3">
                🔥 SORTEIOS DO SOARES
             </h1>
             <p className="text-slate-400">Escolha um sorteio abaixo e participe com seus coins.</p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
              {listaSorteios.length === 0 ? (
                  <div className="text-center py-20 bg-[#1b1e24] rounded-2xl border border-white/5 border-dashed">
                    <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-slate-500">Nenhum sorteio ativo.</h3>
                    <p className="text-slate-600">Fique atento ao nosso Instagram!</p>
                  </div>
              ) : (
                  <div className={listaSorteios.length === 1 ? "flex justify-center" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"}>
                      {listaSorteios.map((sorteio) => (
                          <div key={sorteio.id} className={`bg-[#1b1e24] rounded-2xl border overflow-hidden flex flex-col transition relative group ${listaSorteios.length === 1 ? "w-full max-w-4xl" : "w-full"} ${sorteio.status === "Finalizado" ? "border-red-900/50 opacity-90" : "border-white/5 hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/10"}`}>
                              <div className="absolute top-4 right-4 z-10">
                                  {sorteio.status === "Ativo" ? (
                                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-green-500/30">
                                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                                          <span className="text-[10px] text-white font-bold uppercase tracking-widest">Online</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-red-500/30">
                                          <Lock className="w-3 h-3 text-red-500"/>
                                          <span className="text-[10px] text-white font-bold uppercase tracking-widest">Encerrado</span>
                                      </div>
                                  )}
                              </div>
                              <div className="bg-[#15171c] p-8 flex items-center justify-center relative h-64 overflow-hidden group-hover:bg-[#181a20] transition">
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent)]"></div>
                                  <img src={sorteio.img} alt="Skin" className={`max-h-full drop-shadow-2xl transition duration-500 ${sorteio.status === "Ativo" ? "group-hover:scale-110 group-hover:rotate-3" : "grayscale opacity-50"}`} />
                              </div>
                              <div className="p-6 flex flex-col flex-1 border-t border-white/5">
                                  <div className="mb-6">
                                      <h2 className="text-2xl font-black text-white uppercase italic truncate">{sorteio.nome}</h2>
                                      <p className="text-slate-400 font-medium text-sm mt-1 flex items-center gap-2">
                                          Valor Estimado: <span className="text-green-400 font-bold">R$ {sorteio.valor}</span>
                                      </p>
                                  </div>
                                  <div className="mt-auto">
                                      {sorteio.status === "Ativo" ? (
                                          <button onClick={() => abrirModal(sorteio)} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm rounded-lg transition shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2 active:scale-95 tracking-wide">
                                              <Ticket className="w-4 h-4"/> Participar
                                          </button>
                                      ) : (
                                          <button disabled className="w-full py-3 bg-white/5 text-slate-500 font-bold text-sm uppercase rounded-lg cursor-not-allowed flex items-center justify-center gap-2 border border-white/5">
                                              Finalizado
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: PARCEIROS */}
      <section id="parceiros" className="min-h-screen flex flex-col justify-center items-center border-t border-white/5 bg-[#0f1014] py-20 px-4">
            <div className="max-w-7xl mx-auto w-full">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Nossos <span className="text-yellow-500">Parceiros</span></h2>
                    <p className="text-slate-500 text-lg mt-4 max-w-2xl mx-auto">Utilize nossos cupons exclusivos para garantir os melhores bônus de depósito do mercado.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center">
                    <div className="bg-[#1b1e24] p-6 rounded-3xl border border-white/5 hover:border-yellow-500/50 transition duration-300 group hover:-translate-y-2 flex justify-center items-center shadow-xl hover:shadow-yellow-500/10">
                        <img src="/image_2.png" alt="INSANE.GG" className="max-w-full h-auto rounded-2xl drop-shadow-lg transition group-hover:scale-105"/>
                    </div>
                    <div className="bg-[#1b1e24] p-6 rounded-3xl border border-white/5 hover:border-yellow-500/50 transition duration-300 group hover:-translate-y-2 flex justify-center items-center shadow-xl hover:shadow-yellow-500/10">
                        <img src="/image_3.png" alt="CSGOBIG" className="max-w-full h-auto rounded-2xl drop-shadow-lg transition group-hover:scale-105"/>
                    </div>
                    <div className="bg-[#1b1e24] p-6 rounded-3xl border border-white/5 hover:border-yellow-500/50 transition duration-300 group hover:-translate-y-2 flex justify-center items-center shadow-xl hover:shadow-yellow-500/10">
                        <img src="/image_4.png" alt="TOPSKIN" className="max-w-full h-auto rounded-2xl drop-shadow-lg transition group-hover:scale-105"/>
                    </div>
                </div>
            </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-[#0f1014] border-t-2 border-yellow-600 pt-16 pb-8 px-4 md:px-8">
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
                        
                        {/* LINK INÍCIO COM ROLAGEM SUAVE */}
                        <li>
                            <a href="/" onClick={(e) => handleScroll(e, "top")} className="hover:text-yellow-500 transition flex items-center gap-2 cursor-pointer">
                                <div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Início
                            </a>
                        </li>
                        
                        {/* LINK PARCEIROS COM ROLAGEM SUAVE */}
                        <li>
                            <a href="#parceiros" onClick={(e) => handleScroll(e, "parceiros")} className="hover:text-yellow-500 transition flex items-center gap-2 cursor-pointer">
                                <div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Parceiros
                            </a>
                        </li>

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

      {modalAberto && sorteioSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-[#1b1e24] w-full max-w-md rounded-2xl border border-white/10 p-6 relative animate-in zoom-in-95 overflow-y-auto max-h-[90vh] shadow-2xl">
                <button onClick={() => setModalAberto(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition"><X /></button>
                <h3 className="font-bold text-lg mb-1 flex gap-2 items-center text-white uppercase italic">
                    <Gift className="text-yellow-500"/> Confirmar Entrada
                </h3>
                <p className="text-xs text-slate-400 mb-6">Você está participando do sorteio: <span className="text-white font-bold">{sorteioSelecionado.nome}</span></p>

                <form onSubmit={confirmarParticipacao} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">ID CSGOBIG</label>
                            <input type="text" placeholder="Seu ID..." required value={csgobigId} onChange={e=>setCsgobigId(e.target.value)} className="w-full bg-[#0f1014] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition placeholder:text-slate-700"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-yellow-500 mb-1 block">Qtd. Coins</label>
                            <input type="number" placeholder="Ex: 50" required value={qtdCoins} onChange={e=>setQtdCoins(e.target.value)} className="w-full bg-[#0f1014] border border-yellow-500/30 rounded-lg p-3 text-yellow-500 outline-none focus:border-yellow-500 font-black transition placeholder:text-yellow-500/20"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Instagram (Para contato)</label>
                        <input type="text" placeholder="@seu.usuario" required value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-[#0f1014] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition placeholder:text-slate-700"/>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Comprovante de Envio</label>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer relative hover:bg-white/5 hover:border-white/20 transition group bg-[#0f1014]">
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
                                    <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2 group-hover:text-white transition"/>
                                    <span className="text-slate-500 text-xs font-bold group-hover:text-white">Clique para enviar print</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button type="submit" disabled={enviando || !arquivoPrint} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-white transition shadow-lg shadow-green-900/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-95 uppercase italic tracking-wide">
                        {enviando ? "ENVIANDO DADOS..." : "CONFIRMAR PARTICIPAÇÃO"}
                    </button>
                </form>
            </div>
        </div>
      )}
    </main>
  );
}