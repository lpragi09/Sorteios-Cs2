import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { chancesPorTier } from "@/lib/chat";
import {
  drandRoundTime, entriesText, fetchDrandLatestRound, fetchDrandRound, pickWinner, sha256Hex,
  type FairDraw, type FairEntry, type FairKind,
} from "@/lib/fair";

export const FAIR_COLUMNS =
  "id, kind, target_id, title, entries, total_weight, entries_hash, drand_round, drand_randomness, drand_signature, ticket, winner_label, status, created_at, drawn_at";

type Pool = { title: string; entries: FairEntry[]; refs: Map<string, string> };

// A lista sai sempre do banco (nunca do navegador)
async function buildPool(targetId: string): Promise<(Pool & { kind: FairKind }) | null> {
  const db = supabaseAdmin;
  const { data: s } = await db.from("sorteios").select("titulo, tipo, chance_t1, chance_t2, chance_t3").eq("id", targetId).maybeSingle();
  if (!s) return null;
  const { data: ganhos } = await db.from("ganhadores").select("nome, email").eq("sorteio_id", targetId);
  const jaGanhou = new Set((ganhos ?? []).flatMap((g) => [g.nome, g.email]).filter(Boolean) as string[]);

  const pesos = new Map<string, { weight: number; ref: string; label: string }>();

  if (s.tipo === "ticket") {
    // Tickets aprovados. Cada coin vale uma chance, somando os tickets da mesma conta Google.
    // Quem já ganhou este sorteio fica de fora das próximas rodadas.
    const { data: tickets } = await db
      .from("tickets")
      .select("email, instagram, coins, criado_em")
      .eq("sorteio_id", targetId)
      .eq("status", "aprovado")
      .order("criado_em");
    for (const t of tickets ?? []) {
      if (jaGanhou.has(t.email)) continue;
      const atual = pesos.get(t.email);
      // O nome público é o Instagram do ticket mais recente da pessoa
      pesos.set(t.email, { weight: (atual?.weight ?? 0) + Math.max(1, Math.floor(t.coins)), ref: t.email, label: t.instagram });
    }
  } else {
    // Chat: cada pessoa entra uma vez, com as chances do tier do sub
    const { data: parts } = await db.from("chat_participantes").select("twitch_login, sub_tier").eq("sorteio_id", targetId).eq("removido", false);
    for (const p of parts ?? []) {
      if (jaGanhou.has(p.twitch_login)) continue;
      pesos.set(p.twitch_login, { weight: chancesPorTier(p.sub_tier, s), ref: p.twitch_login, label: p.twitch_login });
    }
  }

  // Nomes repetidos (duas contas com o mesmo Instagram) ganham um sufixo pra lista não ter linha igual
  const usados = new Map<string, number>();
  const refs = new Map<string, string>();
  const entries = [...pesos.values()]
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : a.ref < b.ref ? -1 : 1))
    .map((p) => {
      const n = (usados.get(p.label) ?? 0) + 1;
      usados.set(p.label, n);
      const label = n === 1 ? p.label : `${p.label} #${n}`;
      refs.set(label, p.ref);
      return { label, weight: p.weight };
    });
  return { kind: s.tipo as FairKind, title: s.titulo, entries, refs };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

/**
 * Congela a lista, grava (com a rodada futura do drand) e, quando a rodada sai,
 * calcula e grava o ganhador. Leva de 3 a 7 segundos.
 */
export async function runFairDraw(targetId: string): Promise<{ draw?: FairDraw; error?: string; status?: number }> {
  const db = supabaseAdmin;
  const pool = await buildPool(targetId);
  if (!pool) return { error: "Sorteio não encontrado.", status: 404 };
  if (pool.entries.length === 0) return { error: "Não há ninguém aprovado pra sortear.", status: 400 };

  const entriesHash = await sha256Hex(entriesText(pool.entries));
  // Duas rodadas à frente da última publicada: o número ainda não existe quando a lista é gravada.
  let latest: number;
  try {
    latest = await fetchDrandLatestRound();
  } catch {
    return { error: "O número público (drand) não respondeu. Tente sortear de novo.", status: 503 };
  }
  const round = latest + 2;

  const { data: created, error } = await db
    .from("fair_draws")
    .insert({
      kind: pool.kind,
      target_id: targetId,
      title: pool.title,
      entries: pool.entries,
      total_weight: pool.entries.reduce((s, e) => s + e.weight, 0),
      entries_hash: entriesHash,
      drand_round: round,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Erro ao sortear.", status: 500 };

  await wait(Math.min(6500, drandRoundTime(round) - Date.now() + 400));
  let beacon: { randomness: string; signature: string } | null = null;
  for (let attempt = 0; attempt < 12 && !beacon; attempt++) {
    try {
      beacon = await fetchDrandRound(round);
    } catch {
      await wait(1000);
    }
  }
  if (!beacon) return { error: "O número público (drand) não respondeu. Tente sortear de novo.", status: 503 };

  const { ticket, index } = await pickWinner(pool.entries, entriesHash, beacon.randomness);
  const label = pool.entries[index].label;
  const { data: draw, error: updateError } = await db
    .from("fair_draws")
    .update({
      drand_randomness: beacon.randomness,
      drand_signature: beacon.signature,
      ticket: ticket.toString(),
      winner_label: label,
      winner_ref: pool.refs.get(label) ?? label,
      status: "drawn",
      drawn_at: new Date().toISOString(),
    })
    .eq("id", created.id)
    .select(FAIR_COLUMNS)
    .single();
  if (updateError || !draw) return { error: updateError?.message ?? "Erro ao sortear.", status: 500 };
  return { draw: draw as FairDraw };
}

/** Confirma o giro: grava o ganhador (dados tirados do banco, não do navegador). */
export async function confirmFairDraw(drawId: string): Promise<{ error?: string; status?: number }> {
  const db = supabaseAdmin;
  const { data: draw } = await db
    .from("fair_draws")
    .select("id, kind, target_id, winner_label, winner_ref, status")
    .eq("id", drawId)
    .maybeSingle();
  if (!draw || draw.status !== "drawn" || !draw.winner_label) return { error: "Esse giro não está esperando confirmação.", status: 409 };

  // Trava: só um pedido consegue passar de "drawn" pra "confirmed"
  const { data: travado } = await db.from("fair_draws").update({ status: "confirmed" }).eq("id", drawId).eq("status", "drawn").select("id");
  if (!travado?.length) return { error: "Esse giro já foi confirmado.", status: 409 };

  const { count } = await db.from("ganhadores").select("id", { count: "exact", head: true }).eq("sorteio_id", draw.target_id);
  const linha: Record<string, unknown> = {
    sorteio_id: draw.target_id,
    rodada: (count ?? 0) + 1,
    nome: draw.winner_label,
    fair_draw_id: draw.id,
  };
  if (draw.kind === "ticket") {
    const { data: tickets } = await db
      .from("tickets")
      .select("casa, casa_id, coins, criado_em")
      .eq("sorteio_id", draw.target_id)
      .eq("email", draw.winner_ref)
      .eq("status", "aprovado")
      .order("criado_em", { ascending: false });
    linha.email = draw.winner_ref;
    linha.casa = tickets?.[0]?.casa ?? null;
    linha.casa_id = tickets?.[0]?.casa_id ?? null;
    linha.coins = (tickets ?? []).reduce((s, t) => s + t.coins, 0);
    linha.nome = draw.winner_label.replace(/ #\d+$/, "");
  }
  const { error } = await db.from("ganhadores").insert(linha);
  if (error) {
    await db.from("fair_draws").update({ status: "drawn" }).eq("id", drawId);
    return { error: error.message, status: 500 };
  }
  return {};
}

/** Descarta o giro (ninguém respondeu, sortear de novo). */
export async function skipFairDraw(id: string) {
  await supabaseAdmin.from("fair_draws").update({ status: "skipped" }).eq("id", id).eq("status", "drawn");
}
