"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Lock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Configuração do cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    carregarDados();
  }, []);

  const carregarDados = async () => {
    // Carrega sorteios do localStorage (como você já fazia para os itens)
    const salvos = localStorage.getItem("lista_sorteios");
    if (salvos) {
      setListaSorteios(JSON.parse(salvos));
    } else {
      const padrao = [{ 
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

  const confirmarParticipacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csgobigId || !qtdCoins || !instagram || !arquivoPrint || !sorteioSelecionado || !session?.user?.email) {
      alert("Preencha todos os dados!");
      return;
    }

    setEnviando(true);

    try {
      // SALVANDO NO SUPABASE
      const { error } = await supabase
        .from('tickets')
        .insert([
          { 
            sorteio_id: sorteioSelecionado.id,
            email: session.user.email,
            csgobig_id: csgobigId,
            instagram: instagram,
            coins: Number(qtdCoins),
            print_url: arquivoPrint, // Em produção, ideal é subir p/ Storage, mas Base64 funciona para testes
            user_image: session.user.image,
            status: "Pendente"
          },
        ]);

      if (error) throw error;

      setModalAberto(false);
      alert(`✅ Sucesso! Sua participação na ${sorteioSelecionado.nome} foi enviada para análise.`);
    } catch (error: any) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen text-white pb-20 pt-10">
      {/* O RESTANTE DO SEU HTML CONTINUA IGUAL */}
      {/* APENAS O BOTÃO DE ENVIAR NO MODAL MUDA PARA MOSTRAR O STATUS DE CARREGANDO */}
      
      {/* ... (dentro do modal) */}
      <button 
        type="submit" 
        disabled={enviando}
        className={`w-full ${enviando ? 'bg-slate-700' : 'bg-green-600 hover:bg-green-500'} py-4 rounded-lg font-bold text-white transition shadow-lg text-lg`}
      >
        {enviando ? "ENVIANDO..." : "CONFIRMAR PARTICIPAÇÃO"}
      </button>
      {/* ... */}
    </main>
  );
}