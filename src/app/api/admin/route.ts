import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUser } from "@/lib/auth";
import { PARCEIRO_COLUNAS, SORTEIO_COLUNAS, limparInstagram } from "@/lib/sorteios";
import { loginValido } from "@/lib/chat";
import { registrarEntradaChat } from "@/lib/chatServer";
import { desligarCaptura, ligarCaptura, type StatusCaptura } from "@/lib/eventsub";
import { assinarPrints, EXTENSOES_IMAGEM, PREMIOS_BUCKET, removerImagemPremio, removerPrints } from "@/lib/prints";
import { confirmFairDraw, runFairDraw, skipFairDraw } from "@/lib/fairServer";
import { falha, semCache } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // o sorteio espera o drand (até ~15s)

const ehId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const ehNumero = (v: unknown): v is number => Number.isInteger(Number(v)) && Number(v) > 0;

// Campos do sorteio que o painel pode mudar, já limpos
function camposSorteio(b: Record<string, unknown>) {
  const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const inteiro = (v: unknown, padrao: number) => Math.min(1000, Math.max(1, Math.floor(Number(v)) || padrao));
  const valor = b.valor === "" || b.valor == null ? null : Number(String(b.valor).replace(",", "."));
  const fecha = typeof b.fecha_em === "string" && b.fecha_em ? new Date(b.fecha_em) : null;
  const canal = texto(b.canal, 25)?.toLowerCase().replace(/^@/, "") ?? null;
  return {
    tipo: b.tipo === "chat" ? "chat" : "ticket",
    titulo: texto(b.titulo, 120),
    descricao: texto(b.descricao, 600),
    imagem_url: texto(b.imagem_url, 600),
    valor: valor != null && Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : null,
    status: b.status === "encerrado" ? "encerrado" : "aberto",
    fecha_em: fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString() : null,
    canal: canal && loginValido(canal) ? canal : null,
    comando: (texto(b.comando, 30) ?? "!sorteio").toLowerCase().split(/\s+/)[0],
    chance_t1: inteiro(b.chance_t1, 2),
    chance_t2: inteiro(b.chance_t2, 3),
    chance_t3: inteiro(b.chance_t3, 5),
  };
}

// Desliga a captação pelo servidor no canal só se nenhum outro sorteio estiver captando nele
async function desligarSeNinguemCapta(canal: string) {
  const { data } = await supabaseAdmin.from("sorteios").select("id").eq("tipo", "chat").eq("status", "aberto").eq("captando", true).eq("canal", canal).limit(1);
  if (!data?.length) await desligarCaptura(canal);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return falha("Acesso negado.", 403);

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return falha("Pedido inválido.");
  const db = supabaseAdmin;

  switch (b.acao) {
    // ---------- sorteios ----------
    case "listarSorteios": {
      const [{ data: sorteios, error }, { data: resumo }] = await Promise.all([
        db.from("sorteios").select(SORTEIO_COLUNAS).order("criado_em", { ascending: false }),
        db.from("sorteios_resumo").select("id, tickets, coins, pendentes, chat"),
      ]);
      if (error) return falha(error.message, 500);
      const porId = new Map((resumo ?? []).map((r) => [r.id, r]));
      return semCache({
        sorteios: (sorteios ?? []).map((s) => ({
          ...s,
          tickets: Number(porId.get(s.id)?.tickets ?? 0),
          coins: Number(porId.get(s.id)?.coins ?? 0),
          pendentes: Number(porId.get(s.id)?.pendentes ?? 0),
          chat: Number(porId.get(s.id)?.chat ?? 0),
        })),
      });
    }

    case "salvarSorteio": {
      const campos = camposSorteio(b);
      if (!campos.titulo) return falha("Dê um nome ao sorteio.");
      if (campos.tipo === "chat" && !campos.canal) return falha("Informe o canal da Twitch.");
      if (ehId(b.id)) {
        const { data: antes } = await db.from("sorteios").select("imagem_url").eq("id", b.id).maybeSingle();
        const { data, error } = await db.from("sorteios").update(campos).eq("id", b.id).select(SORTEIO_COLUNAS).single();
        if (error) return falha(error.message, 500);
        if (antes?.imagem_url && antes.imagem_url !== campos.imagem_url) await removerImagemPremio(antes.imagem_url);
        return semCache({ sorteio: data });
      }
      const { data, error } = await db.from("sorteios").insert(campos).select(SORTEIO_COLUNAS).single();
      if (error) return falha(error.message, 500);
      return semCache({ sorteio: data });
    }

    case "statusSorteio": {
      if (!ehId(b.id)) return falha("Sorteio inválido.");
      const status = b.status === "encerrado" ? "encerrado" : "aberto";
      const extra = status === "encerrado" ? { captando: false } : {};
      const { data: s, error } = await db.from("sorteios").update({ status, ...extra }).eq("id", b.id).select("canal").single();
      if (error) return falha(error.message, 500);
      if (status === "encerrado" && s?.canal) await desligarSeNinguemCapta(s.canal);
      return semCache({ ok: true });
    }

    case "excluirSorteio": {
      if (!ehId(b.id)) return falha("Sorteio inválido.");
      const [{ data: s }, { data: tickets }] = await Promise.all([
        db.from("sorteios").select("imagem_url").eq("id", b.id).maybeSingle(),
        db.from("tickets").select("print_path").eq("sorteio_id", b.id),
      ]);
      const { error } = await db.from("sorteios").delete().eq("id", b.id);
      if (error) return falha(error.message, 500);
      await Promise.all([removerPrints((tickets ?? []).map((t) => t.print_path)), removerImagemPremio(s?.imagem_url)]);
      return semCache({ ok: true });
    }

    case "linkImagem": {
      const ext = EXTENSOES_IMAGEM[String(b.tipoArquivo)];
      if (!ext) return falha("Use uma imagem PNG, JPG, WEBP, GIF ou AVIF.");
      const path = `${randomUUID()}.${ext}`;
      const { data, error } = await db.storage.from(PREMIOS_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return falha("Não foi possível preparar o envio da imagem.", 500);
      const publicUrl = db.storage.from(PREMIOS_BUCKET).getPublicUrl(path).data.publicUrl;
      return semCache({ path: data.path, token: data.token, publicUrl });
    }

    // ---------- tickets ----------
    case "listarTickets": {
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const { data, error } = await db
        .from("tickets")
        .select("id, email, nome, avatar_url, casa, casa_id, coins, instagram, print_path, status, criado_em")
        .eq("sorteio_id", b.sorteioId)
        .order("criado_em", { ascending: false })
        .limit(5000);
      if (error) return falha(error.message, 500);
      return semCache({ tickets: await assinarPrints(data ?? []) });
    }

    case "statusTicket": {
      if (!ehNumero(b.id) || !["pendente", "aprovado", "recusado"].includes(String(b.status))) return falha("Pedido inválido.");
      const { error } = await db.from("tickets").update({ status: b.status }).eq("id", b.id);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    case "editarTicket": {
      if (!ehNumero(b.id)) return falha("Ticket inválido.");
      const coins = Math.floor(Number(b.coins));
      const instagram = limparInstagram(String(b.instagram ?? ""));
      const casaId = String(b.casa_id ?? "").trim().slice(0, 80);
      if (!(coins > 0) || !instagram || !casaId) return falha("Preencha coins, ID e Instagram.");
      const { error } = await db.from("tickets").update({ coins, instagram, casa_id: casaId }).eq("id", b.id);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    case "excluirTicket": {
      if (!ehNumero(b.id)) return falha("Ticket inválido.");
      const { data: t } = await db.from("tickets").select("print_path").eq("id", b.id).maybeSingle();
      const { error } = await db.from("tickets").delete().eq("id", b.id);
      if (error) return falha(error.message, 500);
      await removerPrints([t?.print_path]);
      return semCache({ ok: true });
    }

    // ---------- sorteio justo ----------
    case "sortear": {
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const r = await runFairDraw(b.sorteioId);
      return r.error ? falha(r.error, r.status) : semCache({ draw: r.draw });
    }

    case "confirmarGanhador": {
      if (!ehId(b.drawId)) return falha("Giro inválido.");
      const r = await confirmFairDraw(b.drawId);
      return r.error ? falha(r.error, r.status) : semCache({ ok: true });
    }

    case "descartarGiro": {
      if (!ehId(b.drawId)) return falha("Giro inválido.");
      await skipFairDraw(b.drawId);
      return semCache({ ok: true });
    }

    case "listarGanhadores": {
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const { data, error } = await db
        .from("ganhadores")
        .select("id, rodada, nome, email, casa, casa_id, coins, fair_draw_id, criado_em")
        .eq("sorteio_id", b.sorteioId)
        .order("rodada");
      return error ? falha(error.message, 500) : semCache({ ganhadores: data ?? [] });
    }

    case "excluirGanhador": {
      if (!ehNumero(b.id)) return falha("Ganhador inválido.");
      const { error } = await db.from("ganhadores").delete().eq("id", b.id);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    // ---------- chat da Twitch ----------
    case "captarChat": {
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const { data: s, error } = await db.from("sorteios").update({ captando: !!b.captando }).eq("id", b.sorteioId).eq("tipo", "chat").select("canal").single();
      if (error) return falha(error.message, 500);
      // Abrir o chat também liga a captação pelo servidor (se o app da Twitch estiver configurado)
      let servidor: StatusCaptura | "desligada" = "desligada";
      if (b.captando && s?.canal) servidor = await ligarCaptura(s.canal, new URL(request.url).origin);
      else if (s?.canal) await desligarSeNinguemCapta(s.canal);
      return semCache({ ok: true, servidor });
    }

    case "entradaChat": {
      // Mandado pelo painel (tmi.js) a cada pessoa que digita o comando
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const r = await registrarEntradaChat(b.sorteioId, String(b.login ?? ""), Number(b.tier));
      return r.ok ? semCache(r) : falha(r.erro, r.status);
    }

    case "listarChat": {
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const { data, error } = await db
        .from("chat_participantes")
        .select("id, twitch_login, avatar_url, sub_tier, removido, criado_em")
        .eq("sorteio_id", b.sorteioId)
        .order("criado_em", { ascending: false })
        .limit(5000);
      return error ? falha(error.message, 500) : semCache({ participantes: data ?? [] });
    }

    case "removerChat": {
      if (!ehNumero(b.id)) return falha("Participante inválido.");
      const { error } = await db.from("chat_participantes").update({ removido: !!b.removido }).eq("id", b.id);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    case "limparChat": {
      if (!ehId(b.sorteioId)) return falha("Sorteio inválido.");
      const { error } = await db.from("chat_participantes").delete().eq("sorteio_id", b.sorteioId);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    // ---------- vencedores (todos os sorteios) ----------
    case "listarVencedores": {
      const { data, error } = await db
        .from("ganhadores")
        .select("id, sorteio_id, rodada, nome, email, casa, casa_id, coins, fair_draw_id, entregue, entregue_em, criado_em, sorteios(titulo, valor, tipo)")
        .order("criado_em", { ascending: false })
        .limit(2000);
      if (error) return falha(error.message, 500);
      return semCache({
        vencedores: (data ?? []).map(({ sorteios, ...g }) => {
          const s = sorteios as unknown as { titulo: string; valor: number | null; tipo: string } | null;
          return { ...g, sorteio_titulo: s?.titulo ?? "", sorteio_valor: s?.valor ?? null, sorteio_tipo: s?.tipo ?? "" };
        }),
      });
    }

    case "marcarEntregue": {
      if (!ehNumero(b.id)) return falha("Vencedor inválido.");
      const entregue = !!b.entregue;
      const { error } = await db.from("ganhadores").update({ entregue, entregue_em: entregue ? new Date().toISOString() : null }).eq("id", b.id);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    case "editarVencedor": {
      if (!ehNumero(b.id)) return falha("Vencedor inválido.");
      const nome = String(b.nome ?? "").trim().slice(0, 60);
      if (!nome) return falha("Informe o nome.");
      const { error } = await db.from("ganhadores").update({ nome }).eq("id", b.id);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    // ---------- provably fair (visão do admin, com quem ganhou) ----------
    case "listarGiros": {
      const { data, error } = await db
        .from("fair_draws")
        .select("id, kind, target_id, title, total_weight, drand_round, winner_label, winner_ref, status, created_at, drawn_at")
        .order("created_at", { ascending: false })
        .limit(500);
      return error ? falha(error.message, 500) : semCache({ giros: data ?? [] });
    }

    // ---------- usuários do site ----------
    case "listarUsuarios": {
      const [{ data: usuarios, error }, { data: tickets }, { data: ganhos }] = await Promise.all([
        db.from("usuarios").select("email, nome, avatar_url, criado_em, ultimo_acesso, acessos, bloqueado").order("ultimo_acesso", { ascending: false }).limit(10000),
        db.from("tickets").select("email, status, coins").limit(100000),
        db.from("ganhadores").select("email").not("email", "is", null),
      ]);
      if (error) return falha(error.message, 500);
      const porEmail = new Map<string, { tickets: number; aprovados: number; coins: number; vitorias: number }>();
      const conta = (e: string) => porEmail.get(e) ?? porEmail.set(e, { tickets: 0, aprovados: 0, coins: 0, vitorias: 0 }).get(e)!;
      for (const t of tickets ?? []) {
        const c = conta(t.email);
        c.tickets++;
        if (t.status === "aprovado") { c.aprovados++; c.coins += t.coins; }
      }
      for (const g of ganhos ?? []) if (g.email) conta(g.email).vitorias++;
      return semCache({ usuarios: (usuarios ?? []).map((u) => ({ ...u, ...(porEmail.get(u.email) ?? { tickets: 0, aprovados: 0, coins: 0, vitorias: 0 }) })) });
    }

    case "bloquearUsuario": {
      const email = String(b.email ?? "").toLowerCase();
      if (!email.includes("@")) return falha("Usuário inválido.");
      const { error } = await db.from("usuarios").update({ bloqueado: !!b.bloqueado }).eq("email", email);
      return error ? falha(error.message, 500) : semCache({ ok: true });
    }

    // ---------- parceiros ----------
    case "listarParceiros": {
      const { data, error } = await db.from("parceiros").select(PARCEIRO_COLUNAS).order("ordem").order("nome");
      return error ? falha(error.message, 500) : semCache({ parceiros: data ?? [] });
    }

    case "salvarParceiro": {
      const id = String(b.id ?? "").trim().toLowerCase();
      const nome = String(b.nome ?? "").trim().slice(0, 60);
      const link = String(b.link ?? "").trim().slice(0, 500);
      if (!/^[a-z0-9-]{2,30}$/.test(id)) return falha("O identificador precisa ter de 2 a 30 letras minúsculas, números ou hífen.");
      if (!nome) return falha("Informe o nome do parceiro.");
      if (!/^https?:\/\//i.test(link)) return falha("O link precisa começar com https://");
      const linha = {
        id,
        nome,
        link,
        destaque: String(b.destaque ?? "").trim().slice(0, 80) || null,
        imagem_url: String(b.imagem_url ?? "").trim().slice(0, 600) || null,
        ordem: Math.floor(Number(b.ordem)) || 0,
        ativo: b.ativo !== false,
      };
      if (b.novo) {
        const { error } = await db.from("parceiros").insert(linha);
        if (error?.code === "23505") return falha("Já existe um parceiro com esse identificador.");
        return error ? falha(error.message, 500) : semCache({ ok: true });
      }
      const { data: antes } = await db.from("parceiros").select("imagem_url").eq("id", id).maybeSingle();
      const { error } = await db.from("parceiros").update(linha).eq("id", id);
      if (error) return falha(error.message, 500);
      if (antes?.imagem_url && antes.imagem_url !== linha.imagem_url) await removerImagemPremio(antes.imagem_url);
      return semCache({ ok: true });
    }

    case "excluirParceiro": {
      const id = String(b.id ?? "");
      const { data: p } = await db.from("parceiros").select("imagem_url").eq("id", id).maybeSingle();
      const { error } = await db.from("parceiros").delete().eq("id", id);
      if (error) return falha(error.message, 500);
      await removerImagemPremio(p?.imagem_url);
      return semCache({ ok: true });
    }

    default:
      return falha("Ação desconhecida.");
  }
}
