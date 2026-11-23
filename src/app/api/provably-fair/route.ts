import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FAIR_COLUMNS } from "@/lib/fairServer";
import { comCache, falha } from "@/lib/http";

export const dynamic = "force-dynamic";

const LIST_COLUMNS = "id, kind, target_id, title, total_weight, drand_round, winner_label, status, created_at, drawn_at";

// Registro público dos giros: ?id= traz um giro completo (com a lista), ?sorteio= os giros de um sorteio
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const sorteio = url.searchParams.get("sorteio");

  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return falha("Giro não encontrado.", 404);
    const { data } = await supabaseAdmin.from("fair_draws").select(FAIR_COLUMNS).eq("id", id).maybeSingle();
    if (!data) return falha("Giro não encontrado.", 404);
    return comCache({ draw: data });
  }

  let query = supabaseAdmin.from("fair_draws").select(LIST_COLUMNS).neq("status", "waiting").order("created_at", { ascending: false }).limit(100);
  if (sorteio && /^[0-9a-f-]{36}$/i.test(sorteio)) query = query.eq("target_id", sorteio);
  const { data } = await query;
  return comCache({ draws: data ?? [] });
}
