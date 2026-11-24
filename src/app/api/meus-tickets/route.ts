import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUser } from "@/lib/auth";
import { falha, semCache } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return falha("Entre com o Google pra ver seus tickets.", 401);
  const { data: conta } = await supabaseAdmin.from("usuarios").select("bloqueado").eq("email", user.email).maybeSingle();
  if (conta?.bloqueado) return falha("Sua conta foi bloqueada.", 403);

  const [{ data: tickets, error }, { data: ganhos }] = await Promise.all([
    supabaseAdmin
      .from("tickets")
      .select("id, sorteio_id, casa, casa_id, coins, instagram, status, criado_em, sorteios(titulo, valor, status, imagem_url)")
      .eq("email", user.email)
      .order("criado_em", { ascending: false })
      .limit(200),
    supabaseAdmin.from("ganhadores").select("sorteio_id").eq("email", user.email),
  ]);
  if (error) return falha("Não foi possível carregar seus tickets.", 500);

  const venceu = new Set((ganhos ?? []).map((g) => g.sorteio_id));
  return semCache({
    tickets: (tickets ?? []).map(({ sorteios, ...t }) => ({ ...t, sorteio: sorteios, ganhou: venceu.has(t.sorteio_id) })),
  });
}
