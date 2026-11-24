import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PARCEIRO_COLUNAS, PARCEIROS_PADRAO, SORTEIO_COLUNAS, type SorteioPublico } from "@/lib/sorteios";
import { comCache, falha } from "@/lib/http";

export const dynamic = "force-dynamic";

// "Quem já levou" mostra só os últimos 30 dias (a lista zera sozinha)
const DIAS_GANHADORES = 30;

// Tudo o que a home precisa numa chamada só, sem imagem pesada (as imagens são links do Storage)
export async function GET() {
  const db = supabaseAdmin;
  const desde = new Date(Date.now() - DIAS_GANHADORES * 86_400_000).toISOString();
  const [abertos, encerrados, ultimos, parceiros] = await Promise.all([
    db.from("sorteios").select(SORTEIO_COLUNAS).eq("status", "aberto").order("criado_em", { ascending: false }),
    db.from("sorteios").select(SORTEIO_COLUNAS).eq("status", "encerrado").order("criado_em", { ascending: false }).limit(30),
    db.from("ganhadores").select("id, sorteio_id, rodada, nome, email, criado_em, fair_draw_id, sorteios(titulo, valor, tipo)").gte("criado_em", desde).order("criado_em", { ascending: false }).limit(100),
    db.from("parceiros").select(PARCEIRO_COLUNAS).eq("ativo", true).order("ordem").order("nome"),
  ]);
  if (abertos.error || encerrados.error) return falha("Não foi possível carregar os sorteios.", 500);

  const lista = [...(abertos.data ?? []), ...(encerrados.data ?? [])];
  const ids = lista.map((s) => s.id);
  const [resumo, ganhos] = ids.length
    ? await Promise.all([
        db.from("sorteios_resumo").select("id, chat").in("id", ids),
        db.from("ganhadores").select("sorteio_id, rodada, nome").in("sorteio_id", ids).order("rodada"),
      ])
    : [{ data: [] }, { data: [] }];

  const porId = new Map((resumo.data ?? []).map((r) => [r.id, r]));
  const sorteios: SorteioPublico[] = lista.map((s) => ({
    ...s,
    chat: Number(porId.get(s.id)?.chat ?? 0),
    ganhadores: (ganhos.data ?? []).filter((g) => g.sorteio_id === s.id).map((g) => ({ rodada: g.rodada, nome: g.nome })),
  }));

  // Foto de quem ganhou: Twitch no sorteio do chat, Google no mensal (o e-mail não sai daqui)
  const vencedores = ultimos.data ?? [];
  const tipoDe = (g: (typeof vencedores)[number]) => (g.sorteios as unknown as { tipo?: string } | null)?.tipo;
  const emails = [...new Set(vencedores.filter((g) => tipoDe(g) === "ticket" && g.email).map((g) => g.email as string))];
  const doChat = vencedores.filter((g) => tipoDe(g) === "chat");
  const [fotosGoogle, fotosTwitch] = await Promise.all([
    emails.length ? db.from("usuarios").select("email, avatar_url").in("email", emails) : Promise.resolve({ data: [] as { email: string; avatar_url: string | null }[] }),
    doChat.length
      ? db.from("chat_participantes").select("sorteio_id, twitch_login, avatar_url").in("sorteio_id", [...new Set(doChat.map((g) => g.sorteio_id))]).in("twitch_login", [...new Set(doChat.map((g) => g.nome))])
      : Promise.resolve({ data: [] as { sorteio_id: string; twitch_login: string; avatar_url: string | null }[] }),
  ]);
  const google = new Map((fotosGoogle.data ?? []).map((u) => [u.email, u.avatar_url]));
  const twitch = new Map((fotosTwitch.data ?? []).map((p) => [`${p.sorteio_id}:${p.twitch_login}`, p.avatar_url]));

  const ganhadores = vencedores.map((g) => {
    const s = g.sorteios as unknown as { titulo: string; valor: number | null; tipo: string } | null;
    const foto = s?.tipo === "chat" ? twitch.get(`${g.sorteio_id}:${g.nome}`) : g.email ? google.get(g.email) : null;
    return { id: g.id, sorteio_id: g.sorteio_id, rodada: g.rodada, nome: g.nome, coins: null, criado_em: g.criado_em, fair_draw_id: g.fair_draw_id, sorteio_titulo: s?.titulo ?? "", sorteio_valor: s?.valor ?? null, foto: foto ?? null };
  });

  return comCache({ sorteios, ganhadores, parceiros: parceiros.error ? PARCEIROS_PADRAO : parceiros.data ?? [] });
}
