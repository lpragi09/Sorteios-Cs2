import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUser } from "@/lib/auth";
import { falha, semCache } from "@/lib/http";
import { limparNome, limparWhatsapp } from "@/lib/perfil";

export const dynamic = "force-dynamic";

// O cadastro de quem está logado (popup depois do login)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return falha("Entre com o Google.", 401);
  const { data, error } = await supabaseAdmin.from("usuarios").select("nome_cadastro, whatsapp, bloqueado").eq("email", user.email).maybeSingle();
  // Sem as colunas novas no banco (migração não rodada), não incomoda ninguém
  if (error) return semCache({ completo: true, nome: user.name, whatsapp: null });
  // Quem já estava logado antes da lista de usuários existir entra nela aqui
  if (!data) await supabaseAdmin.rpc("registrar_login", { p_email: user.email, p_nome: user.name, p_avatar: user.image });
  return semCache({
    bloqueado: !!data?.bloqueado,
    completo: !!(data?.nome_cadastro && data?.whatsapp),
    nome: data?.nome_cadastro ?? user.name,
    whatsapp: data?.whatsapp ?? null,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return falha("Entre com o Google.", 401);
  const b = await req.json().catch(() => ({}));
  const nome = limparNome(String(b.nome ?? ""));
  const whatsapp = limparWhatsapp(String(b.whatsapp ?? ""));
  if (nome.length < 2) return falha("Digite o seu nome.");
  if (!whatsapp) return falha("Digite um WhatsApp com DDD, como (11) 98765-4321.");
  const { data: conta } = await supabaseAdmin.from("usuarios").select("bloqueado").eq("email", user.email).maybeSingle();
  if (conta?.bloqueado) return falha("Sua conta foi bloqueada.", 403);

  const { error } = await supabaseAdmin
    .from("usuarios")
    .upsert(
      {
        email: user.email,
        ...(user.name ? { nome: user.name } : {}),
        ...(user.image ? { avatar_url: user.image } : {}),
        nome_cadastro: nome,
        whatsapp,
        cadastrado_em: new Date().toISOString(),
      },
      { onConflict: "email", ignoreDuplicates: false }
    );
  if (error) return falha("Não foi possível salvar. Tente de novo.", 500);
  return semCache({ ok: true });
}
