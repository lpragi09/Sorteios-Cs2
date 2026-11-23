import { assinaturaValida } from "@/lib/eventsub";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { registrarEntradaChat } from "@/lib/chatServer";
import { ehComando, tierPelosBadges } from "@/lib/chat";

// Webhook do EventSub: a Twitch chama esta rota a cada mensagem do chat do canal
// enquanto a captação pelo servidor está ligada.
export async function POST(request: Request) {
  const corpo = await request.text();
  if (!assinaturaValida(request.headers, corpo)) return new Response("assinatura inválida", { status: 403 });

  // Rejeita mensagens antigas (proteção contra reenvio)
  const enviadaEm = Date.parse(request.headers.get("twitch-eventsub-message-timestamp") || "");
  if (!enviadaEm || Date.now() - enviadaEm > 10 * 60 * 1000) return new Response("mensagem antiga", { status: 403 });

  const json = JSON.parse(corpo);
  const tipo = request.headers.get("twitch-eventsub-message-type");

  // A Twitch confirma que o endereço é nosso antes de começar a mandar o chat
  if (tipo === "webhook_callback_verification") {
    return new Response(json.challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  if (tipo !== "notification") return new Response(null, { status: 204 });

  const evento = json.event ?? {};
  const canal = String(evento.broadcaster_user_login || "").toLowerCase();
  const quem = String(evento.chatter_user_login || "").toLowerCase();
  const texto = String(evento.message?.text || "");
  if (!canal || !quem) return new Response(null, { status: 204 });

  const { data: sorteios } = await supabaseAdmin
    .from("sorteios")
    .select("id, comando")
    .eq("tipo", "chat")
    .eq("status", "aberto")
    .eq("captando", true)
    .eq("canal", canal);

  const badges: { set_id: string; id: string }[] = evento.badges ?? [];
  const tier = tierPelosBadges(Object.fromEntries(badges.map((b) => [b.set_id, b.id])));
  for (const s of sorteios ?? []) {
    if (ehComando(texto, s.comando)) await registrarEntradaChat(s.id, quem, tier);
  }
  return new Response(null, { status: 204 });
}
