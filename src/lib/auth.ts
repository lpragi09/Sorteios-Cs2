import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isAdmin } from "@/lib/admins";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Sempre deixa escolher a conta, senão quem tem várias entra direto na errada
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  events: {
    // Cada login entra na lista "Usuários do site" do painel
    async signIn({ user }) {
      if (!user.email) return;
      try {
        await supabaseAdmin.rpc("registrar_login", { p_email: user.email, p_nome: user.name ?? null, p_avatar: user.image ?? null });
      } catch (err) {
        console.error("registrar_login:", err);
      }
    },
  },
  callbacks: {
    async session({ session }) {
      if (session.user) {
        (session.user as { isAdmin?: boolean }).isAdmin = isAdmin(session.user.email);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export type SessionUser = { email: string; name: string | null; image: string | null; isAdmin: boolean };

/** Quem está fazendo a requisição (conta Google), ou null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  return { email, name: session?.user?.name ?? null, image: session?.user?.image ?? null, isAdmin: isAdmin(email) };
}
