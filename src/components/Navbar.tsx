"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Shield, Twitch, Instagram, Handshake, Ticket, Menu, X, Home } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  
  const ADMIN_EMAILS = ["soarescscontato@gmail.com", "lpmragi@gmail.com"];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, targetId: string) => {
    if (pathname === "/") {
        e.preventDefault();
        if (targetId === "top") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            const element = document.getElementById(targetId);
            if (element) {
                const headerOffset = 100;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        }
    }
    setMenuAberto(false);
  };

  return (
    <>
      {/* --- CAMADA INVISÍVEL (CORREÇÃO DO BUG) --- */}
      {/* Ela agora está FORA da <nav>, então cobre 100% da tela sem ser bloqueada pelo blur da barra */}
      {menuAberto && (
        <div 
            className="fixed inset-0 z-[99] bg-black/10 backdrop-blur-[1px] cursor-default" 
            onClick={() => setMenuAberto(false)}
        />
      )}

      {/* --- BARRA DE NAVEGAÇÃO (z-100 fica acima da camada invisível) --- */}
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-white/5 bg-[#0f1014]/95 backdrop-blur-md h-20 flex items-center shadow-lg shadow-black/40">
        
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center relative">
          
          {/* LOGO */}
          <a href="/" onClick={(e) => handleSmoothScroll(e, "top")} className="text-2xl font-black italic tracking-tighter text-white uppercase flex items-center gap-1 group cursor-pointer">
            <span className="text-yellow-500 group-hover:drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all">CS2</span>
            SOARES
          </a>

          {/* --- LINKS DESKTOP --- */}
          <div className="hidden md:flex items-center gap-6">
              
              <a 
                  href="/" 
                  onClick={(e) => handleSmoothScroll(e, "top")}
                  className="flex items-center gap-2 font-bold text-sm uppercase text-white hover:text-yellow-500 transition-colors group cursor-pointer"
              >
                  <Home className="w-5 h-5 group-hover:text-yellow-500 transition-all"/>
                  HOME
              </a>

              <a href="https://twitch.tv/canaldosoares" target="_blank" className="flex items-center gap-2 font-bold text-sm uppercase text-white hover:text-[#9146ff] transition-colors group">
                  <Twitch className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_#9146ff] transition-all"/>
                  Twitch
              </a>

              <a href="https://instagram.com/seuinstead" target="_blank" className="flex items-center gap-2 font-bold text-sm uppercase text-white hover:text-[#E1306C] transition-colors group">
                  <Instagram className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_#E1306C] transition-all"/>
                  Instagram
              </a>

              <a 
                  href="/#parceiros" 
                  onClick={(e) => handleSmoothScroll(e, "parceiros")}
                  className="flex items-center gap-2 font-bold text-sm uppercase text-white hover:text-yellow-500 transition-colors group cursor-pointer"
              >
                  <Handshake className="w-5 h-5 group-hover:text-yellow-500 transition-all"/>
                  Parceiros
              </a>

              <div className="h-6 w-px bg-white/10 mx-2"></div>

              {/* Área do Usuário */}
              {session ? (
                  <div className="relative">
                      <button 
                          onClick={() => setMenuAberto(!menuAberto)}
                          className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-3 rounded-full border border-transparent hover:border-white/10 transition"
                      >
                          <img 
                              src={session.user?.image || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                              alt="Avatar" 
                              className="w-9 h-9 rounded-full object-cover border border-white/20"
                          />
                          <div className="text-left leading-tight hidden lg:block">
                              <p className="text-xs font-bold text-white uppercase">{session.user?.name?.split(' ')[0]}</p>
                              <p className="text-[10px] text-gray-400">Minha Conta</p>
                          </div>
                      </button>

                      {/* Dropdown Menu (Desktop) */}
                      {menuAberto && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-[#1b1e24] border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-[101]">
                              {session?.user?.email && ADMIN_EMAILS.includes(session.user.email) && (
                                  <Link href="/admin" onClick={() => setMenuAberto(false)}>
                                      <div className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-yellow-500 font-bold border-b border-white/5">
                                          <Shield className="w-4 h-4" /> Painel Admin
                                      </div>
                                  </Link>
                              )}
                              <Link href="/meus-sorteios" onClick={() => setMenuAberto(false)}>
                                  <div className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 text-white">
                                      <Ticket className="w-4 h-4" /> Meus Tickets
                                  </div>
                              </Link>
                              <button onClick={() => signOut()} className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition flex items-center gap-3 border-t border-white/5">
                                  <LogOut className="w-4 h-4" /> Sair
                              </button>
                          </div>
                      )}
                  </div>
              ) : (
                  <button onClick={() => signIn("google")} className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 rounded font-black text-sm uppercase tracking-wide transition shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                      Login
                  </button>
              )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button className="md:hidden text-white p-2" onClick={() => setMenuAberto(!menuAberto)}>
              {menuAberto ? <X /> : <Menu />}
          </button>

          {/* MOBILE OVERLAY MENU */}
          {menuAberto && (
               <div className="absolute top-20 left-0 w-full bg-[#0f1014] border-b border-white/10 p-4 flex flex-col gap-4 md:hidden shadow-2xl animate-in slide-in-from-top-5 h-screen z-[101]">
                  
                  <a href="/" onClick={(e) => handleSmoothScroll(e, "top")} className="flex items-center gap-3 p-3 rounded bg-white/5 text-white font-bold hover:text-yellow-500">
                      <Home className="w-5 h-5"/> HOME
                  </a>

                  <a href="https://twitch.tv/canaldosoares" className="flex items-center gap-3 p-3 rounded bg-white/5 text-[#9146ff] font-bold">
                      <Twitch className="w-5 h-5"/> Twitch
                  </a>
                  <a href="https://instagram.com/seuinstead" className="flex items-center gap-3 p-3 rounded bg-white/5 text-[#E1306C] font-bold">
                      <Instagram className="w-5 h-5"/> Instagram
                  </a>
                  <a href="#parceiros" onClick={(e) => handleSmoothScroll(e, "parceiros")} className="flex items-center gap-3 p-3 rounded bg-white/5 text-yellow-500 font-bold">
                      <Handshake className="w-5 h-5"/> Parceiros
                  </a>
                  
                  {session ? (
                      <>
                          <Link href="/meus-sorteios" onClick={() => setMenuAberto(false)} className="flex items-center gap-3 p-3 rounded bg-white/5 text-white font-bold">
                              <Ticket className="w-5 h-5"/> Meus Tickets
                          </Link>
                           {session?.user?.email && ADMIN_EMAILS.includes(session.user.email) && (
                              <Link href="/admin" onClick={() => setMenuAberto(false)} className="flex items-center gap-3 p-3 rounded bg-yellow-500/10 text-yellow-500 font-bold">
                                  <Shield className="w-5 h-5"/> Admin
                              </Link>
                           )}
                          <button onClick={() => signOut()} className="flex items-center gap-3 p-3 rounded bg-red-500/10 text-red-400 font-bold w-full">
                              <LogOut className="w-5 h-5"/> Sair
                          </button>
                      </>
                  ) : (
                      <button onClick={() => signIn("google")} className="bg-yellow-500 text-black p-3 rounded font-black uppercase">
                          Entrar com Google
                      </button>
                  )}
               </div>
          )}
        </div>
      </nav>
    </>
  );
}