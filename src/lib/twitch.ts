// Acesso à API Helix da Twitch com token de app (client credentials). Só no servidor.
// Sem TWITCH_CLIENT_ID/SECRET tudo aqui devolve vazio e o site segue funcionando
// (o painel continua lendo o chat pelo navegador).

const HELIX = "https://api.twitch.tv/helix";
let appToken: { value: string; expiresAt: number } | null = null;

export const twitchConfigurada = () => !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

export async function getAppToken(): Promise<string | null> {
  if (!twitchConfigurada()) return null;
  if (appToken && appToken.expiresAt > Date.now() + 60_000) return appToken.value;
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    client_secret: process.env.TWITCH_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: "POST" });
  if (!res.ok) return null;
  const json = await res.json();
  appToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return appToken.value;
}

export async function helix(caminho: string, init: RequestInit = {}) {
  const token = await getAppToken();
  if (!token) throw new Error("App da Twitch não configurado.");
  const res = await fetch(`${HELIX}${caminho}`, {
    ...init,
    headers: { "Client-Id": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 401) appToken = null; // token venceu antes da hora: pega outro na próxima
  return res;
}

export async function idDoCanal(login: string): Promise<string | null> {
  const res = await helix(`/users?login=${encodeURIComponent(login.toLowerCase())}`);
  if (!res.ok) return null;
  return (await res.json())?.data?.[0]?.id ?? null;
}

/** Foto de perfil pelo login, ou null (sem foto o site usa um avatar com a inicial). */
export async function fotoTwitch(login: string): Promise<string | null> {
  try {
    if (!twitchConfigurada()) return null;
    const res = await helix(`/users?login=${encodeURIComponent(login)}`);
    if (!res.ok) return null;
    return (await res.json())?.data?.[0]?.profile_image_url ?? null;
  } catch {
    return null;
  }
}
