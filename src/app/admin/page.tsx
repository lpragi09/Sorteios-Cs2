"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Users, Gift, CheckCircle, XCircle, ExternalLink, Plus, Pencil, X, Upload, Trash2, Coins, BarChart3, Trophy, RefreshCw, Lock, Unlock, TrendingUp, Sparkles, Zap } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const ADMIN_EMAIL = "lpmragi@gmail.com";

  const [isAdmin, setIsAdmin] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [sorteioSelecionado, setSorteioSelecionado] = useState<any | null>(null);
  const [listaSorteios, setListaSorteios] = useState<any[]>([]);
  const [ticketsDoSorteio, setTicketsDoSorteio] = useState<any[]>([]);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
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
  }, [status, session, router]);

  const carregarSorteios = async () => {
    const { data } = await supabase.from('sorteios').select('*').order('created_at', { ascending: false });
    if (data) setListaSorteios(data);
  };

  const abrirSorteio = async (sorteio: any) => {
    setSorteioSelecionado(sorteio);
    const { data } = await supabase.from('tickets').select('*').eq('sorteio_id', sorteio.id);
    if (data) setTicketsDoSorteio(data);
  };

  // FUNÇÃO QUE ESTAVA FALTANDO
  const iniciarSorteio = () => {
    if (!sorteioSelecionado) return;
    const aprovados = ticketsDoSorteio.filter(t => t.status === "Aprovado");
    if (aprovados.length === 0) {
      alert("Nenhum ticket aprovado para sortear!");
      return;
    }
    const vencedor = aprovados[Math.floor(Math.random() * aprovados.length)];
    alert(`O vencedor é: @${vencedor.instagram}`);
  };

  const handleCriarSorteio = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('sorteios').insert([{ nome: formNome, img: formImg, valor: formValor, status: "Ativo" }]);
    if (!error) {
      setModalCriarAberto(false);
      carregarSorteios();
    }
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black flex items-center gap-2"><Shield className="text-yellow-500" /> PAINEL ADMIN</h1>
          <button onClick={() => setModalCriarAberto(true)} className="bg-green-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus /> Novo Sorteio</button>
        </div>

        {!sorteioSelecionado ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listaSorteios.map((s) => (
              <div key={s.id} onClick={() => abrirSorteio(s)} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 cursor-pointer hover:border-yellow-500 transition flex items-center gap-6">
                <img src={s.img} alt="" className="w-20 h-20 object-contain" />
                <div>
                  <h3 className="text-xl font-bold">{s.nome}</h3>
                  <p className="text-slate-400">R$ {s.valor}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setSorteioSelecionado(null)} className="mb-4 text-slate-400 hover:text-white">← Voltar</button>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Tickets: {sorteioSelecionado.nome}</h2>
                <button onClick={iniciarSorteio} className="bg-green-600 px-6 py-2 rounded-xl font-black">SORTEAR AGORA</button>
              </div>
              {/* Tabela de tickets simplificada para build */}
              <div className="space-y-2">
                {ticketsDoSorteio.map(t => (
                  <div key={t.id} className="p-4 bg-slate-950 rounded-lg flex justify-between">
                    <span>@{t.instagram}</span>
                    <span className="text-yellow-500 font-bold">{t.coins} Coins</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {modalCriarAberto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 p-8 rounded-3xl w-full max-w-md border border-slate-800">
            <h3 className="text-2xl font-bold mb-6">Novo Sorteio</h3>
            <form onSubmit={handleCriarSorteio} className="space-y-4">
              <input type="text" placeholder="Nome da Skin" value={formNome} onChange={e => setFormNome(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl" />
              <input type="text" placeholder="Valor" value={formValor} onChange={e => setFormValor(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl" />
              <input type="text" placeholder="URL da Imagem" value={formImg} onChange={e => setFormImg(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl" />
              <button type="submit" className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl">CRIAR</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}