import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUser } from "@/lib/auth";
import { inscricoesAbertas, limparInstagram } from "@/lib/sorteios";
import { PRINTS_BUCKET } from "@/lib/prints";
import { falha, semCache } from "@/lib/http";

const MAX_PENDENTES = 10; // por pessoa e sorteio, pra ninguém lotar a fila de aprovação

async function sorteioAberto(id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabaseAdmin.from("sorteios").select("id, tipo, status, fecha_em").eq("id", id).maybeSingle();
  return data && data.tipo === "ticket" && inscricoesAbertas(data) ? data : null;
}

// Dois passos: "link" devolve um endereço pra enviar o print direto pro Storage;
// "enviar" grava o ticket depois que o print subiu.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return falha("Entre com o Google pra participar.", 401);
  const { data: conta } = await supabaseAdmin.from("usuarios").select("bloqueado").eq("email", user.email).maybeSingle();
  if (conta?.bloqueado) return falha("Sua conta foi bloqueada.", 403);
  const body = await request.json().catch(() => null);
  const sorteio = await sorteioAberto(body?.sorteioId);
  if (!sorteio) return falha("Esse sorteio não está aceitando tickets.", 409);

  if (body.acao === "link") {
    const path = `${sorteio.id}/${randomUUID()}.webp`;
    const { data, error } = await supabaseAdmin.storage.from(PRINTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return falha("Não foi possível preparar o envio do print.", 500);
    return semCache({ path: data.path, token: data.token });
  }

  if (body.acao === "enviar") {
    const { data: parceiro } = await supabaseAdmin.from("parceiros").select("id").eq("id", String(body.casa ?? "")).eq("ativo", true).maybeSingle();
    const casa = parceiro?.id;
    const casaId = String(body.casaId ?? "").trim().slice(0, 80);
    const coins = Math.floor(Number(body.coins));
    const instagram = limparInstagram(String(body.instagram ?? "")).slice(0, 40);
    const printPath = String(body.printPath ?? "");

    if (!casa) return falha("Escolha a casa onde você depositou.");
    if (!casaId) return falha("Informe o seu ID na casa.");
    if (!Number.isFinite(coins) || coins < 1 || coins > 10_000_000) return falha("Informe quantas coins você depositou.");
    if (instagram.length < 2) return falha("Informe o seu Instagram.");
    // O print tem que ser um arquivo deste sorteio que acabou de subir
    if (!printPath.startsWith(`${sorteio.id}/`) || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(printPath)) return falha("Envie o print do depósito.");
    const nome = printPath.split("/")[1];
    const { data: arquivos } = await supabaseAdmin.storage.from(PRINTS_BUCKET).list(sorteio.id, { search: nome, limit: 1 });
    if (!arquivos?.some((a) => a.name === nome)) return falha("O print não chegou. Tente enviar de novo.");

    const { count } = await supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("sorteio_id", sorteio.id)
      .eq("email", user.email)
      .eq("status", "pendente");
    if ((count ?? 0) >= MAX_PENDENTES) return falha("Você já tem muitos tickets esperando aprovação neste sorteio. Aguarde a equipe conferir.", 429);

    const { error } = await supabaseAdmin.from("tickets").insert({
      sorteio_id: sorteio.id,
      email: user.email,
      nome: user.name,
      avatar_url: user.image,
      casa,
      casa_id: casaId,
      coins,
      instagram,
      print_path: printPath,
    });
    if (error) return falha("Não foi possível salvar o ticket.", 500);
    return semCache({ ok: true });
  }

  return falha("Ação inválida.");
}
