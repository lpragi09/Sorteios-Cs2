"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { LogOut, User, Shield } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuAberto, setMenuAberto] = useState(false);
  
  const ADMIN_EMAILS = ["soarescscontato@gmail.com", "lpmragi@gmail.com"];

  return (
    // NAVBAR: z-[100] para garantir que fique acima de qualquer card ou animação do site
    <nav className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80 backdrop-blur sticky top-0 z-[100]">
      <Link href="/" className="text-xl font-black text-yellow-500 tracking-tighter hover:text-yellow-400 transition">
        Sorteios do Soso
      </Link>

      {/* --- CAMADA INVISÍVEL (OVERLAY) --- */}
      {/* - fixed inset-0: Cobre a tela inteira (h-screen w-screen)
          - z-[99]: Fica logo abaixo do menu (z-100), mas acima de todo o resto do site
          - bg-black/0: Transparente (ou coloque bg-black/50 para escurecer o fundo se quiser)
      */}
      {menuAberto && (
        <div 
            className="fixed inset-0 z-[99] bg-transparent cursor-default h-screen w-screen" 
            onClick={() => setMenuAberto(false)}
        />
      )}

      {session ? (
        <div className="relative z-[101]"> {/* z-[101] para ficar ACIMA da camada invisível */}
          
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex items-center gap-3 hover:bg-slate-800 p-2 rounded-lg transition"
          >
            <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white">{session.user?.name}</p>
                <p className="text-[10px] text-slate-400">Ver opções</p>
            </div>
            <img 
              src={session.user?.image || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-slate-700 object-cover"
            />
          </button>

          {menuAberto && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                
                {session?.user?.email && ADMIN_EMAILS.includes(session.user.email) && (
   <Link href="/admin">
      <button>Dashboard Admin</button>
   </Link>
)}

                <Link href="/meus-sorteios" onClick={() => setMenuAberto(false)}>
                    <div className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-white">
                        <User className="w-4 h-4" /> Meus Sorteios
                    </div>
                </Link>

                <button 
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-3 hover:bg-red-900/20 text-red-400 hover:text-red-300 transition flex items-center gap-2 border-t border-slate-800"
                >
                    <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
            </div>
          )}
        </div>
      ) : (
        <button 
            onClick={() => signIn("google")} 
            className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition"
        >
            Entrar com Google
        </button>
      )}
    </nav>
  );
}