"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import { X, Image as ImageIcon, Lock, Gift, CheckCircle, Trophy, Twitch, Instagram, Youtube, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { getHighlightOption } from "@/lib/sorteioHighlight";

// Inicialização do cliente Supabase
const supabase = createClient();

type Sorteio = {
  id: string;
  nome: string;
  descricao?: string | null;
  destaque_texto?: string | null;
  destaque_cor?: string | null;
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
  
  // ESTADOS DE ARQUIVO
  const [arquivoPrint, setArquivoPrint] = useState<string | null>(null); // Preview na tela (Leve)
  const [arquivoParaUpload, setArquivoParaUpload] = useState<File | null>(null); // Arquivo Real (Para o Storage)

  // LINK DA IMAGEM DE FUNDO
  const bgImageUrl = "/background.png"; 

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
    
    // Resetar todos os campos
    setCsgobigId(""); 
    setQtdCoins(""); 
    setInstagram(""); 
    setArquivoPrint(null);
    setArquivoParaUpload(null); 
    
    setModalAberto(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // TRAVA DE SEGURANÇA: 5MB
      if (file.size > 5 * 1024 * 1024) {
          alert("Imagem muito pesada! Por favor, envie um print menor que 5MB.");
          return;
      }

      // 1. Guarda o arquivo ORIGINAL (para upload no bucket 'prints')
      setArquivoParaUpload(file);

      // 2. Cria um link temporário SUPER LEVE só para mostrar na tela
      const previewUrl = URL.createObjectURL(file);
      setArquivoPrint(previewUrl);
    }
  };

  // --- FUNÇÃO FINAL COM UPLOAD PRO BUCKET 'prints' ---
  const confirmarParticipacao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    if (!csgobigId || !qtdCoins || !instagram || !arquivoParaUpload || !sorteioSelecionado) {
      alert("Preencha todos os dados e envie o comprovante!");
      return;
    }

    setEnviando(true);

    try {
        // --- 1. UPLOAD DA IMAGEM PRO STORAGE (BUCKET: prints) ---
        // Limpeza profunda: Remove acentos e caracteres especiais
        const nomeLimpo = arquivoParaUpload.name
            .normalize("NFD") // Separa os acentos das letras (ex: ó vira o + ´)
            .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
            .replace(/[^a-zA-Z0-9._-]/g, ""); // Remove qualquer coisa que não seja letra, número, ponto ou traço
        
        // Gera um nome único: timestamp_nomedoarquivo.png
        const nomeArquivo = `${Date.now()}_${nomeLimpo}`;
        
        const { error: uploadError } = await supabase
            .storage
            .from('prints') // <--- SEU BUCKET AQUI
            .upload(nomeArquivo, arquivoParaUpload);

        if (uploadError) {
            throw new Error("Erro ao subir imagem: " + uploadError.message);
        }

        // --- 2. PEGAR O LINK PÚBLICO ---
        const { data: publicUrlData } = supabase
            .storage
            .from('prints') // <--- SEU BUCKET AQUI TAMBÉM
            .getPublicUrl(nomeArquivo);

        const linkDaImagem = publicUrlData.publicUrl;

        // --- 3. SALVAR NO BANCO (AGORA COM O LINK!) ---
        const { error: dbError } = await supabase.from('tickets').insert([{
            sorteio_id: sorteioSelecionado.id,
            email: session?.user?.email,
            user_image: session?.user?.image,
            csgobig_id: csgobigId,
            coins: Number(qtdCoins),
            instagram: instagram,
            
            print: linkDaImagem, // <--- SALVA O LINK GERADO, NÃO O ARQUIVO
            
            status: "Pendente",
            data: new Date().toLocaleString()
        }]);

        if (dbError) throw dbError;

        // Sucesso!
        setModalAberto(false);
        if (confirm("✅ Sucesso! Ticket enviado. Deseja ver seus tickets agora?")) {
            window.location.href = "/meus-sorteios";
        }

    } catch (error: any) {
        console.error("Erro no processo:", error);
        alert("Ops! " + error.message);
    } finally {
        setEnviando(false);
    }
  };

  return (
    <div 
        className="flex flex-col min-h-screen bg-[#0f1014] bg-cover bg-center bg-fixed"
        style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15, 16, 20, 0.85), rgba(15, 16, 20, 0.95)), url('${bgImageUrl}')`
        }}
    >
      
      {/* ESPAÇADOR RÍGIDO */}
      <div className="h-32 w-full flex-shrink-0"></div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* HEADER DA PÁGINA */}
          <div className="text-center mb-16 space-y-4">
             <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter flex items-center justify-center gap-3 drop-shadow-lg">
                🔥 SORTEIOS DO SOARES
             </h1>
             <p className="text-slate-400 font-medium">Participe dos sorteios mais insanos da comunidade.</p>
          </div>

          {/* LISTA DE SORTEIOS */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-24">
              {listaSorteios.length === 0 ? (
                  <div className="text-center py-20 bg-[#1b1e24]/80 backdrop-blur-sm rounded-2xl border border-white/5 border-dashed">
                    <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-slate-500">Nenhum sorteio ativo.</h3>
                    <p className="text-slate-600">Fique atento ao nosso Instagram!</p>
                  </div>
              ) : (
                  <div className={listaSorteios.length <= 2 ? "flex flex-col items-center gap-10" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"}>
                      {listaSorteios.map((sorteio) => (
                          <div
                            key={sorteio.id}
                            className={`relative group transition w-full ${listaSorteios.length <= 2 ? "max-w-4xl" : ""} ${sorteio.status === "Finalizado" ? "opacity-90" : ""}`}
                          >
                              {/* CARD ÚNICO (UM BLOCO POR SORTEIO) */}
                              <div
                                className={`relative bg-[#1b1e24]/90 backdrop-blur-md rounded-[40px] border overflow-hidden shadow-lg shadow-black/40 transition duration-300 flex flex-col transform-gpu ${sorteio.status === "Finalizado" ? "border-red-900/50" : "border-white/5 group-hover:border-yellow-500/50 group-hover:shadow-2xl group-hover:shadow-yellow-500/10 group-hover:-translate-y-1"}`}
                              >
                                  {/* Badge de Status */}
                                  <div className="absolute top-5 right-5 z-10">
                                      {sorteio.status === "Ativo" ? (
                                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-green-500/30">
                                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                                              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Online</span>
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30">
                                              <Lock className="w-3 h-3 text-red-500"/>
                                              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Encerrado</span>
                                          </div>
                                      )}
                                  </div>

                                  {/* IMAGEM (um único layer; estica só na horizontal, sem duplicar) */}
                                  <div className="bg-[#15171c]/50 relative p-0 h-80 md:h-96 overflow-hidden flex items-center justify-center">
                                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_70%)]"></div>

                                      <img
                                        src={sorteio.img}
                                        alt="Skin"
                                        className={`relative w-full h-full object-contain object-center ${sorteio.status === "Finalizado" ? "grayscale opacity-50" : ""}`}
                                      />
                                  </div>

                                  {/* CONTEÚDO */}
                                  <div className="p-6 md:p-7 flex flex-col flex-1 border-t border-white/5">
                                      <div className="mb-6">
                                          <h2 className="text-2xl font-black text-white uppercase italic leading-tight break-words">
                                              {sorteio.nome}
                                          </h2>
                                          {!!sorteio.destaque_texto && (
                                            <div className="mt-3">
                                              <span className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getHighlightOption(sorteio.destaque_cor).pill}`}>
                                                <span className={`w-2 h-2 rounded-full ${getHighlightOption(sorteio.destaque_cor).dot}`}></span>
                                                {sorteio.destaque_texto}
                                              </span>
                                            </div>
                                          )}
                                          {!!sorteio.descricao && (
                                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                              {sorteio.descricao}
                                            </p>
                                          )}
                                          <p className="text-slate-400 font-medium text-sm mt-2 flex items-center gap-2">
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
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* --- SEÇÃO: PARCEIROS --- */}
          <section id="parceiros" className="border-t border-white/5 pt-20 pb-10">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Nossos <span className="text-yellow-500">Parceiros</span></h2>
                <p className="text-slate-500 text-sm mt-2">Utilize nossos cupons para os melhores bônus do mercado.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto justify-items-center">
                <a
                    href="https://csgobig.com/r/soares"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir parceiro CSGOBIG (cupom Soares)"
                    className="w-full max-w-md bg-[#1b1e24]/90 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition duration-300 group hover:-translate-y-1 shadow-lg hover:shadow-yellow-500/10 block"
                >
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-xl">
                        <img src="/image_3.png" alt="CSGOBIG Cupom Soares" className="w-full h-full object-cover object-center drop-shadow-md transition group-hover:scale-[1.02]"/>
                    </div>
                </a>

                <a
                    href="https://topskin.net/utm/soares"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir parceiro TOPSKIN (cupom Soares)"
                    className="w-full max-w-md bg-[#1b1e24]/90 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition duration-300 group hover:-translate-y-1 shadow-lg hover:shadow-yellow-500/10 block"
                >
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-xl">
                        <img src="/image_4.png" alt="TOPSKIN Cupom Soares" className="w-full h-full object-cover object-center drop-shadow-md transition group-hover:scale-[1.02]"/>
                    </div>
                </a>

                <a
                    href="https://togamme.com/soares"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir parceiro LEON (cupom Soares)"
                    className="w-full max-w-md bg-[#1b1e24]/90 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition duration-300 group hover:-translate-y-1 shadow-lg hover:shadow-yellow-500/10 block"
                >
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-xl">
                        <img src="/leon.png" alt="LEON Cupom Soares" className="w-full h-full object-cover object-center drop-shadow-md transition group-hover:scale-[1.02]"/>
                    </div>
                </a>
            </div>
          </section>

        </div>
      </main>

      {/* --- RODAPÉ --- */}
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
                            <li><Link href="/mix" className="hover:text-yellow-500 transition flex items-center gap-2"><div className="w-1 h-1 bg-yellow-500 rounded-full"></div> Mix Maker</Link></li>
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

      {/* --- MODAL DE PARTICIPAÇÃO --- */}
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
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">ID da Casa</label>
                            <input type="text" placeholder="Seu ID na casa..." required value={csgobigId} onChange={e=>setCsgobigId(e.target.value)} className="w-full bg-[#0f1014] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition placeholder:text-slate-700"/>
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
                    <button type="submit" disabled={enviando || !arquivoParaUpload} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-white transition shadow-lg shadow-green-900/20 text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-95 uppercase italic tracking-wide">
                        {enviando ? "ENVIANDO DADOS..." : "CONFIRMAR PARTICIPAÇÃO"}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}