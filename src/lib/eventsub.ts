import { createHmac, timingSafeEqual } from "crypto";
import { helix, idDoCanal, twitchConfigurada } from "@/lib/twitch";

// Captação pelo servidor: a Twitch avisa o site (webhook EventSub) a cada mensagem
// do chat, então o sorteio segue captando mesmo com o painel fechado.
// Requisito da Twitch: o dono do canal autoriza o app uma vez (user:read:chat, user:bot, channel:bot).

const EVENTO = "channel.chat.message";

/** Segredo do webhook, derivado do NEXTAUTH_SECRET (sem precisar de outra variável). */
export function segredoEventSub(): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET || "").update("soares-eventsub").digest("hex");
}

/** Confere a assinatura que a Twitch manda em cada chamada do webhook. */
export function assinaturaValida(headers: Headers, corpo: string): boolean {
  const id = headers.get("twitch-eventsub-message-id") || "";
  const quando = headers.get("twitch-eventsub-message-timestamp") || "";
  const assinatura = headers.get("twitch-eventsub-message-signature") || "";
  const esperado = "sha256=" + createHmac("sha256", segredoEventSub()).update(id + quando + corpo).digest("hex");
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Assinatura = { id: string; status: string; condition: { broadcaster_user_id: string }; transport: { callback?: string } };

async function assinaturasDoChat(canalId?: string): Promise<Assinatura[]> {
  const res = await helix(`/eventsub/subscriptions?type=${EVENTO}`);
  if (!res.ok) return [];
  const lista: Assinatura[] = (await res.json())?.data ?? [];
  return canalId ? lista.filter((s) => s.condition.broadcaster_user_id === canalId) : lista;
}

export type StatusCaptura = "ligada" | "precisa_autorizar" | "sem_app" | "so_https" | "erro";

/** Liga a captação pelo servidor no canal. */
export async function ligarCaptura(canal: string, origem: string): Promise<StatusCaptura> {
  if (!twitchConfigurada()) return "sem_app";
  // A Twitch só entrega webhook em HTTPS público (não funciona em localhost)
  if (!origem.startsWith("https://")) return "so_https";
  try {
    const canalId = await idDoCanal(canal);
    if (!canalId) return "erro";
    const callback = `${origem}/api/twitch/eventsub`;
    const existentes = await assinaturasDoChat(canalId);
    if (existentes.some((s) => s.status === "enabled" && s.transport.callback === callback)) return "ligada";
    await Promise.all(existentes.map((s) => helix(`/eventsub/subscriptions?id=${s.id}`, { method: "DELETE" })));

    const res = await helix("/eventsub/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        type: EVENTO,
        version: "1",
        condition: { broadcaster_user_id: canalId, user_id: canalId },
        transport: { method: "webhook", callback, secret: segredoEventSub() },
      }),
    });
    if (res.ok) return "ligada";
    if (res.status === 403) return "precisa_autorizar";
    console.error("EventSub:", res.status, await res.text());
    return "erro";
  } catch (err) {
    console.error("EventSub:", err);
    return "erro";
  }
}

/** Desliga a captação pelo servidor no canal. */
export async function desligarCaptura(canal: string | null | undefined): Promise<void> {
  if (!canal || !twitchConfigurada()) return;
  try {
    const canalId = await idDoCanal(canal);
    if (!canalId) return;
    const lista = await assinaturasDoChat(canalId);
    await Promise.all(lista.map((s) => helix(`/eventsub/subscriptions?id=${s.id}`, { method: "DELETE" })));
  } catch (err) {
    console.error("EventSub:", err);
  }
}
