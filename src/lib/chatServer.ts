import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loginValido } from "@/lib/chat";
import { fotoTwitch } from "@/lib/twitch";

export type ResultadoEntrada = { ok: true; novo?: boolean; atualizado?: boolean; repetido?: boolean } | { ok: false; status: number; erro: string };

/**
 * Registra quem digitou o comando no chat. Usado pelo painel (tmi.js no navegador)
 * e pelo webhook da Twitch; os dois podem mandar a mesma pessoa, o unique do banco
 * garante uma linha só. Quem virou sub depois sobe de tier; quem o admin tirou não volta.
 */
export async function registrarEntradaChat(sorteioId: string, loginBruto: string, tierBruto: number): Promise<ResultadoEntrada> {
  const db = supabaseAdmin;
  const login = loginBruto.toLowerCase();
  const tier = [0, 1, 2, 3].includes(tierBruto) ? tierBruto : 0;
  if (!loginValido(login)) return { ok: false, status: 400, erro: "Login inválido." };

  const { data: s } = await db.from("sorteios").select("status, captando, tipo").eq("id", sorteioId).maybeSingle();
  if (!s || s.tipo !== "chat" || s.status !== "aberto" || !s.captando) return { ok: false, status: 409, erro: "O chat não está aberto pra entrar." };

  const { data: existente } = await db
    .from("chat_participantes")
    .select("id, sub_tier, removido")
    .eq("sorteio_id", sorteioId)
    .eq("twitch_login", login)
    .maybeSingle();
  if (existente) {
    if (!existente.removido && tier > existente.sub_tier) {
      await db.from("chat_participantes").update({ sub_tier: tier }).eq("id", existente.id);
      return { ok: true, atualizado: true };
    }
    return { ok: true, repetido: true };
  }

  const { error } = await db.from("chat_participantes").insert({ sorteio_id: sorteioId, twitch_login: login, sub_tier: tier, avatar_url: await fotoTwitch(login) });
  if (error?.code === "23505") return { ok: true, repetido: true };
  if (error) return { ok: false, status: 500, erro: error.message };
  return { ok: true, novo: true };
}
