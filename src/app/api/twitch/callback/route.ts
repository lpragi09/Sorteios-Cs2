import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

// Volta da Twitch depois da autorização. A permissão fica registrada na Twitch;
// o site não guarda o token, só confere de qual conta veio e volta pro painel.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origem = url.origin;
  const voltar = (resultado: string) => Response.redirect(`${origem}/admin?twitch=${encodeURIComponent(resultado)}`, 302);

  const user = await getSessionUser();
  if (!user?.isAdmin) return new Response("Acesso negado.", { status: 403 });

  const jar = await cookies();
  const estado = jar.get("twitch_estado")?.value;
  jar.delete("twitch_estado");
  if (!estado || estado !== url.searchParams.get("state")) return voltar("erro");
  const code = url.searchParams.get("code");
  if (!code) return voltar("cancelado");

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID || "",
      client_secret: process.env.TWITCH_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: `${origem}/api/twitch/callback`,
    }),
  });
  if (!res.ok) return voltar("erro");
  const { access_token } = await res.json();
  const valida = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: `OAuth ${access_token}` } });
  const login = valida.ok ? ((await valida.json()).login as string) : "";
  return voltar(login ? `ok:${login}` : "ok");
}
