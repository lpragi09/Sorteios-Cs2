// Respostas padrão das rotas /api.

export const falha = (mensagem: string, status = 400) => Response.json({ error: mensagem }, { status, headers: { "Cache-Control": "no-store" } });

export const semCache = (dados: unknown) => Response.json(dados, { headers: { "Cache-Control": "no-store" } });

/** Rotas públicas: a CDN da Vercel guarda por 5s e serve a cópia velha enquanto busca a nova. */
export const comCache = (dados: unknown, segundos = 5) =>
  Response.json(dados, {
    headers: {
      "Vercel-CDN-Cache-Control": `max-age=${segundos}, stale-while-revalidate=60`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
