import { markDataChanged } from "@/lib/freshData";

const LEITURAS = new Set(["listarSorteios", "listarTickets", "listarGanhadores", "listarChat", "linkImagem"]);

// Chamada do painel para a rota /api/admin. Lança erro com a mensagem do servidor.
export async function adminApi<T = Record<string, unknown>>(acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, ...dados }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Erro ${res.status}`), { status: res.status });
  // Leituras não mudam nada; o resto faz a home buscar dados novos, sem cache
  if (!LEITURAS.has(acao) && acao !== "entradaChat") markDataChanged();
  return json as T;
}
