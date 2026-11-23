import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Prints dos depósitos: bucket privado, caminho "<sorteioId>/<uuid>.webp".
// O banco guarda só o caminho; o painel recebe links que valem 1 hora.
export const PRINTS_BUCKET = "prints";
export const PREMIOS_BUCKET = "premios";

/** Troca os caminhos por links temporários numa chamada só. */
export async function assinarPrints<T extends { print_path: string }>(rows: T[]): Promise<(T & { print_url: string | null })[]> {
  const paths = [...new Set(rows.map((r) => r.print_path).filter(Boolean))];
  const links = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabaseAdmin.storage.from(PRINTS_BUCKET).createSignedUrls(paths, 60 * 60);
    for (const d of data ?? []) if (d.path && d.signedUrl) links.set(d.path, d.signedUrl);
  }
  return rows.map((r) => ({ ...r, print_url: links.get(r.print_path) ?? null }));
}

export async function removerPrints(paths: (string | null | undefined)[]) {
  const lista = paths.filter((p): p is string => !!p);
  for (let i = 0; i < lista.length; i += 100) {
    await supabaseAdmin.storage.from(PRINTS_BUCKET).remove(lista.slice(i, i + 100));
  }
}

/** Apaga a imagem de um prêmio, se ela estiver no nosso bucket. */
export async function removerImagemPremio(url: string | null | undefined) {
  const marca = `/storage/v1/object/public/${PREMIOS_BUCKET}/`;
  const i = url?.indexOf(marca) ?? -1;
  if (url && i >= 0) await supabaseAdmin.storage.from(PREMIOS_BUCKET).remove([decodeURIComponent(url.slice(i + marca.length))]);
}

export const EXTENSOES_IMAGEM: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/avif": "avif" };
