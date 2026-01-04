"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Users, Gift, CheckCircle, XCircle, ExternalLink, Plus, Pencil, Save, X, Upload, Trash2 } from "lucide-react";

// TIPO DE DADOS
type Sorteio = {
    id: string;
    nome: string;
    img: string;
    valor: string;
    status: "Ativo" | "Finalizado";
};

type Ticket = {
    id: number;
    data: string;
    csgobigId: string;
    coins: number;
    instagram: string;
    print: string;
    status: string;
    email?: string;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const ADMIN_EMAIL = "lpmragi@gmail.com";

  // ESTADOS PRINCIPAIS
  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [sorteioSelecionado, setSorteioSelecionado] = useState<Sorteio | null>(null);
  
  // DADOS
  const [listaSorteios, setListaSorteios] = useState<Sorteio[]>([]);
  const [ticketsDoSorteio, setTicketsDoSorteio] = useState<Ticket[]>([]);

  // MODAIS
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [ticketEmEdicao, setTicketEmEdicao] = useState<Ticket | null>(null);
  const [sorteioEmEdicao, setSorteioEmEdicao] = useState<Sorteio | null>(null); // NOVO: Para editar o sorteio

  // FORMULÁRIO (REUTILIZÁVEL PARA CRIAR E EDITAR)
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
    carregarSorteios();
  }, [status, session]);

  // --- CARREGAMENTO ---
  const carregarSorteios = () => {
    const salvos = localStorage.getItem("lista_sorteios");
    if (salvos) {
        setListaSorteios(JSON.parse(salvos));
    } else {
        const padrao: Sorteio = { 
            id: "ak47", 
            nome: "AK-47 | Redline", 
            img: "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvN0_rTKQXw/360fx360f",
            valor: "150,00",
            status: "Ativo"
        };
        setListaSorteios([padrao]);
        localStorage.setItem("lista_sorteios", JSON.stringify([padrao]));
    }
  };

  const abrirSorteio = (sorteio: Sorteio) => {
    setSorteioSelecionado(sorteio);
    const ticketsSalvos = localStorage.getItem(`tickets_${sorteio.id}`);
    if (ticketsSalvos) {
        setTicketsDoSorteio(JSON.parse(ticketsSalvos));
    } else {
        setTicketsDoSorteio([]);
    }
  };

  // --- HANDLER DE IMAGEM ---
  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- AÇÕES DE SORTEIO ---

  const handleCriarSorteio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImg) { alert("Selecione uma imagem!"); return; }

    const novoSorteio: Sorteio = {
        id: Date.now().toString(),
        nome: formNome,
        img: formImg,
        valor: formValor,
        status: "Ativo"
    };
    const novaLista = [...listaSorteios, novoSorteio];
    setListaSorteios(novaLista);
    localStorage.setItem("lista_sorteios", JSON.stringify(novaLista));
    
    setModalCriarAberto(false);
    limparForm();
    alert("Sorteio criado!");
  };

  // NOVO: Excluir Sorteio
  const handleDeletarSorteio = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede de abrir o sorteio ao clicar no botão
    if (!confirm("Tem certeza que deseja EXCLUIR este sorteio? Essa ação não tem volta.")) return;

    const novaLista = listaSorteios.filter(s => s.id !== id);
    setListaSorteios(novaLista);
    localStorage.setItem("lista_sorteios", JSON.stringify(novaLista));
    // Opcional: Limpar tickets desse sorteio
    localStorage.removeItem(`tickets_${id}`);
  };

  // NOVO: Abrir Modal de Edição de Sorteio
  const handleAbrirEdicaoSorteio = (e: React.MouseEvent, sorteio: Sorteio) => {
    e.stopPropagation();
    setSorteioEmEdicao(sorteio);
    setFormNome(sorteio.nome);
    setFormValor(sorteio.valor);
    setFormImg(sorteio.img);
  };

  // NOVO: Salvar Edição de Sorteio
  const handleSalvarEdicaoSorteio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sorteioEmEdicao) return;

    const novaLista = listaSorteios.map(s => 
        s.id === sorteioEmEdicao.id 
            ? { ...s, nome: formNome, valor: formValor, img: formImg } 
            : s
    );

    setListaSorteios(novaLista);
    localStorage.setItem("lista_sorteios", JSON.stringify(novaLista));
    
    setSorteioEmEdicao(null);
    limparForm();
    alert("Sorteio atualizado!");
  };

  const limparForm = () => {
    setFormNome("");
    setFormImg("");
    setFormValor("");
  };

  // --- AÇÕES DE TICKET ---
  const validarTicket = (id: number, novoStatus: "Aprovado" | "Rejeitado") => {
    const novaLista = ticketsDoSorteio.map(t => 
        t.id === id ? { ...t, status: novoStatus } : t
    );
    setTicketsDoSorteio(novaLista);
    if (sorteioSelecionado) {
        localStorage.setItem(`tickets_${sorteioSelecionado.id}`, JSON.stringify(novaLista));
    }
  };

  const salvarEdicaoTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketEmEdicao || !sorteioSelecionado) return;

    const novaLista = ticketsDoSorteio.map(t => 
        t.id === ticketEmEdicao.id ? ticketEmEdicao : t
    );
    setTicketsDoSorteio(novaLista);
    localStorage.setItem(`tickets_${sorteioSelecionado.id}`, JSON.stringify(novaLista));
    setTicketEmEdicao(null);
    alert("Dados do ticket atualizados!");
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
             <Shield className="text-yellow-500" /> PAINEL ADMIN
          </h1>
          <div className="flex gap-2">
            <button onClick={() => { setAbaAtiva("dashboard"); setSorteioSelecionado(null); }} className={`px-4 py-2 rounded font-bold transition ${abaAtiva === "dashboard" ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-400"}`}>Visão Geral</button>
            <button onClick={() => setAbaAtiva("sorteios")} className={`px-4 py-2 rounded font-bold transition ${abaAtiva === "sorteios" ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-400"}`}>Gerenciar Sorteios</button>
          </div>
        </div>

        {/* --- DASHBOARD --- */}
        {abaAtiva === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <div className="bg-yellow-500/10 w-12 h-12 rounded-full flex items-center justify-center text-yellow-500 mb-4"><Gift /></div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase">Sorteios Ativos</h3>
                    <p className="text-3xl font-bold mt-1">{listaSorteios.length}</p>
                </div>
            </div>
        )}

        {/* --- SORTEIOS --- */}
        {abaAtiva === "sorteios" && (
            <div className="animate-in fade-in">
                {!sorteioSelecionado ? (
                    // LISTA DE SORTEIOS
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold border-l-4 border-yellow-500 pl-3">Sorteios Disponíveis</h2>
                            <button onClick={() => { limparForm(); setModalCriarAberto(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold transition">
                                <Plus className="w-5 h-5"/> Novo Sorteio
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {listaSorteios.map((sorteio) => (
                                <div key={sorteio.id} onClick={() => abrirSorteio(sorteio)} className="bg-slate-900 p-6 rounded-xl border border-slate-800 cursor-pointer hover:border-yellow-500 transition group relative flex items-center gap-6">
                                    <img src={sorteio.img} className="w-20 h-20 object-contain bg-slate-950 rounded p-2" />
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white group-hover:text-yellow-500 transition">{sorteio.nome}</h3>
                                        <p className="text-slate-400 text-sm">R$ {sorteio.valor}</p>
                                    </div>
                                    
                                    {/* BOTÕES DE AÇÃO DO SORTEIO */}
                                    <div className="flex gap-2 z-10">
                                        <button 
                                            onClick={(e) => handleAbrirEdicaoSorteio(e, sorteio)}
                                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg transition"
                                            title="Editar Sorteio"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeletarSorteio(e, sorteio.id)}
                                            className="p-2 bg-red-600 hover:bg-red-500 text-white rounded shadow-lg transition"
                                            title="Excluir Sorteio"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // DENTRO DO SORTEIO (LISTA DE TICKETS)
                    <div>
                        <button onClick={() => setSorteioSelecionado(null)} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1">{"<- Voltar"}</button>
                        
                        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                                <h2 className="text-xl font-bold text-white flex gap-2 items-center"><Users className="text-yellow-500"/> Entradas: {sorteioSelecionado.nome}</h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="p-4">Data/Email</th>
                                            <th className="p-4">ID CSGOBIG</th>
                                            <th className="p-4">Instagram</th>
                                            <th className="p-4 text-center">Coins</th>
                                            <th className="p-4 text-center">Print</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {ticketsDoSorteio.length === 0 ? (
                                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma entrada.</td></tr>
                                        ) : (
                                            ticketsDoSorteio.map((ticket) => (
                                                <tr key={ticket.id} className="hover:bg-slate-800/50 transition">
                                                    <td className="p-4">
                                                        <div className="text-white font-bold">{ticket.data.split(",")[0]}</div>
                                                        <div className="text-xs text-slate-500">{ticket.email}</div>
                                                    </td>
                                                    <td className="p-4 text-white font-mono">{ticket.csgobigId}</td>
                                                    <td className="p-4 text-blue-400">{ticket.instagram}</td>
                                                    <td className="p-4 text-center text-yellow-500 font-bold">{ticket.coins}</td>
                                                    <td className="p-4 text-center">
                                                        <a href={ticket.print} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs inline-flex items-center gap-1 transition">
                                                            <ExternalLink className="w-3 h-3"/> Abrir
                                                        </a>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${ticket.status === "Aprovado" ? "bg-green-900/30 text-green-400" : ticket.status === "Rejeitado" ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-500"}`}>{ticket.status}</span>
                                                    </td>
                                                    <td className="p-4 flex justify-center gap-2">
                                                        <button onClick={() => setTicketEmEdicao(ticket)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg transition" title="Editar"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => validarTicket(ticket.id, "Aprovado")} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded shadow-lg" title="Aprovar"><CheckCircle className="w-4 h-4" /></button>
                                                        <button onClick={() => validarTicket(ticket.id, "Rejeitado")} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded shadow-lg" title="Rejeitar"><XCircle className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- MODAL CRIAR SORTEIO --- */}
        {modalCriarAberto && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-white">Criar Novo Sorteio</h3>
                        <button onClick={() => setModalCriarAberto(false)}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <form onSubmit={handleCriarSorteio} className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 ml-1">Nome da Skin</label>
                            <input type="text" placeholder="Ex: AWP | Asiimov" required value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 ml-1">Valor Estimado</label>
                            <input type="text" placeholder="Ex: 250,00" required value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 ml-1">Imagem</label>
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer relative hover:bg-slate-800 transition group">
                                <input type="file" accept="image/*" onChange={handleImagemChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {formImg ? (
                                    <img src={formImg} className="h-20 object-contain rounded mx-auto" />
                                ) : (
                                    <div className="text-slate-500"><Upload className="w-8 h-8 mx-auto mb-1"/><span className="text-xs">Enviar Foto</span></div>
                                )}
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-bold text-white shadow-lg">Salvar</button>
                    </form>
                </div>
            </div>
        )}

        {/* --- MODAL EDITAR SORTEIO (NOVO!) --- */}
        {sorteioEmEdicao && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-blue-500/30 p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-white flex gap-2 items-center"><Pencil className="w-5 h-5 text-blue-500"/> Editar Sorteio</h3>
                        <button onClick={() => setSorteioEmEdicao(null)}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <form onSubmit={handleSalvarEdicaoSorteio} className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 ml-1">Nome</label>
                            <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 ml-1">Valor</label>
                            <input type="text" value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 ml-1">Trocar Imagem (Opcional)</label>
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer relative hover:bg-slate-800 transition group">
                                <input type="file" accept="image/*" onChange={handleImagemChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {formImg ? <img src={formImg} className="h-20 object-contain mx-auto" /> : <Upload className="mx-auto text-slate-500"/>}
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold text-white shadow-lg">Salvar Alterações</button>
                    </form>
                </div>
            </div>
        )}

        {/* --- MODAL EDITAR TICKET --- */}
        {ticketEmEdicao && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-yellow-500/30 p-6 animate-in zoom-in-95 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-white flex items-center gap-2"><Pencil className="w-5 h-5 text-yellow-500"/> Editar Entrada</h3>
                        <button onClick={() => setTicketEmEdicao(null)}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <form onSubmit={salvarEdicaoTicket} className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 font-bold ml-1">ID CSGOBIG</label>
                            <input type="text" value={ticketEmEdicao.csgobigId} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, csgobigId: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-yellow-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold ml-1">Coins</label>
                            <input type="number" value={ticketEmEdicao.coins} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, coins: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-yellow-500 outline-none font-bold text-yellow-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold ml-1">Instagram</label>
                            <input type="text" value={ticketEmEdicao.instagram} onChange={(e) => setTicketEmEdicao({...ticketEmEdicao, instagram: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-yellow-500 outline-none" />
                        </div>
                        <div className="pt-2">
                             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold text-white flex items-center justify-center gap-2 shadow-lg"><Save className="w-4 h-4" /> Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}