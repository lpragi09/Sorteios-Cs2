import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PARCEIRO_COLUNAS, PARCEIROS_PADRAO, SORTEIO_COLUNAS, type SorteioPublico } from "@/lib/sorteios";
import { comCache, falha } from "@/lib/http";

export const dynamic = "force-dynamic";

// Tudo o que a home precisa numa chamada só, sem imagem pesada (as imagens são links do Storage)
export async function GET() {
  const db = supabaseAdmin;
  const [abertos, encerrados, ultimos, parceiros] = await Promise.all([
    db.from("sorteios").select(SORTEIO_COLUNAS).eq("status", "aberto").order("criado_em", { ascending: false }),
    db.from("sorteios").select(SORTEIO_COLUNAS).eq("status", "encerrado").order("criado_em", { ascending: false }).limit(30),
    db.from("ganhadores").select("id, sorteio_id, rodada, nome, coins, criado_em, fair_draw_id, sorteios(titulo, valor)").order("criado_em", { ascending: false }).limit(50),
    db.from("parceiros").select(PARCEIRO_COLUNAS).eq("ativo", true).order("ordem").order("nome"),
  ]);
  if (abertos.error || encerrados.error) return falha("Não foi possível carregar os sorteios.", 500);

  const lista = [...(abertos.data ?? []), ...(encerrados.data ?? [])];
  const ids = lista.map((s) => s.id);
  const [resumo, ganhos] = ids.length
    ? await Promise.all([
        db.from("sorteios_resumo").select("id, tickets, coins, chat").in("id", ids),
        db.from("ganhadores").select("sorteio_id, rodada, nome").in("sorteio_id", ids).order("rodada"),
      ])
    : [{ data: [] }, { data: [] }];

  const porId = new Map((resumo.data ?? []).map((r) => [r.id, r]));
  const sorteios: SorteioPublico[] = lista.map((s) => ({
    ...s,
    tickets: Number(porId.get(s.id)?.tickets ?? 0),
    coins: Number(porId.get(s.id)?.coins ?? 0),
    chat: Number(porId.get(s.id)?.chat ?? 0),
    ganhadores: (ganhos.data ?? []).filter((g) => g.sorteio_id === s.id).map((g) => ({ rodada: g.rodada, nome: g.nome })),
  }));

  const ganhadores = (ultimos.data ?? []).map((g) => {
    const s = g.sorteios as unknown as { titulo: string; valor: number | null } | null;
    return { id: g.id, sorteio_id: g.sorteio_id, rodada: g.rodada, nome: g.nome, coins: g.coins, criado_em: g.criado_em, fair_draw_id: g.fair_draw_id, sorteio_titulo: s?.titulo ?? "", sorteio_valor: s?.valor ?? null };
  });

  return comCache({ sorteios, ganhadores, parceiros: parceiros.error ? PARCEIROS_PADRAO : parceiros.data ?? [] });
}
