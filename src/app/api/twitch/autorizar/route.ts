import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { twitchConfigurada } from "@/lib/twitch";

// Leva o dono do canal pra tela da Twitch que autoriza o site a ler o chat dele
// (precisa uma vez só; depois a captação pelo servidor liga sozinha).
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return new Response("Acesso negado.", { status: 403 });
  if (!twitchConfigurada()) return new Response("Faltam TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET nas variáveis do site.", { status: 500 });

  const origem = new URL(request.url).origin;
  const estado = randomBytes(16).toString("hex");
  (await cookies()).set("twitch_estado", estado, { httpOnly: true, secure: origem.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/" });

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: `${origem}/api/twitch/callback`,
    response_type: "code",
    scope: "user:read:chat user:bot channel:bot",
    state: estado,
    force_verify: "true", // mostra a conta logada e o "Não é você?"
  });
  return Response.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`, 302);
}
