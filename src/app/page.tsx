"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { X, Trophy } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const [modalAberto, setModalAberto] = useState(false);

  const sorteio = {
    nome: "AK-47 | Redline",
    img: "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvN0_rTKQXw/360fx360f",
    valor: "150,00"
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto mt-10">
        <h1 className="text-3xl font-black mb-8 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> SORTEIOS ATIVOS
        </h1>
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
          <div className="md:w-1/2 bg-slate-800/50 p-10 flex items-center justify-center">
            <img src={sorteio.img} alt="" className="w-64 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]" />
          </div>
          <div className="md:w-1/2 p-10 flex flex-col justify-center">
            <h2 className="text-4xl font-black mb-2">{sorteio.nome}</h2>
            <p className="text-green-400 font-bold text-xl mb-8">Avaliada em R$ {sorteio.valor}</p>
            <button 
              onClick={() => session ? setModalAberto(true) : signIn("google")}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-2xl text-xl transition-all active:scale-95"
            >
              PARTICIPAR AGORA
            </button>
          </div>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-md relative">
            <button onClick={() => setModalAberto(false)} className="absolute top-4 right-4 text-slate-500"><X /></button>
            <h3 className="text-xl font-bold mb-6 text-yellow-500">Enviar Comprovante</h3>
            <div className="space-y-4">
              <input type="text" placeholder="ID CSGOBIG" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:border-yellow-500" />
              <button className="w-full bg-green-600 py-4 rounded-xl font-bold">ENVIAR PARTICIPAÇÃO</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
