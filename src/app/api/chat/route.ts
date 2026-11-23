import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SORTEIO_COLUNAS } from "@/lib/sorteios";
import { chancesPorTier } from "@/lib/chat";
import { comCache, falha } from "@/lib/http";

export const dynamic = "force-dynamic";

// Lista pública de quem entrou pelo chat (a página /chat atualiza a cada poucos segundos).
// Sem ?id= devolve o sorteio do chat mais recente que ainda está aberto.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  let query = supabaseAdmin.from("sorteios").select(SORTEIO_COLUNAS).eq("tipo", "chat");
  query = id && /^[0-9a-f-]{36}$/i.test(id) ? query.eq("id", id) : query.eq("status", "aberto").order("criado_em", { ascending: false }).limit(1);
  const { data: sorteio, error } = await query.maybeSingle();
  if (error) return falha("Não foi possível carregar o sorteio.", 500);
  if (!sorteio) return comCache({ sorteio: null, participantes: [], ganhadores: [] }, 3);

  const [{ data: parts }, { data: ganhadores }] = await Promise.all([
    supabaseAdmin
      .from("chat_participantes")
      .select("twitch_login, avatar_url, sub_tier, criado_em")
      .eq("sorteio_id", sorteio.id)
      .eq("removido", false)
      .order("criado_em", { ascending: false })
      .limit(2000),
    supabaseAdmin.from("ganhadores").select("rodada, nome, criado_em, fair_draw_id").eq("sorteio_id", sorteio.id).order("rodada"),
  ]);

  return comCache(
    {
      sorteio,
      participantes: (parts ?? []).map((p) => ({ ...p, chances: chancesPorTier(p.sub_tier, sorteio) })),
      ganhadores: ganhadores ?? [],
    },
    3
  );
}
