"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { adminApi } from "@/lib/adminApi";

// O navegador só usa o Supabase pra subir arquivo num link assinado que o servidor gerou.
let storage: SupabaseClient | null = null;
function cliente() {
  storage ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  return storage;
}

/** Redimensiona e comprime uma imagem no navegador (canvas → webp). */
export function comprimirImagem(file: File, lado = 1600, qualidade = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Esse arquivo não é uma imagem válida."));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, lado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível processar a imagem."))), "image/webp", qualidade);
    };
    img.src = url;
  });
}

async function enviar(bucket: string, path: string, token: string, blob: Blob) {
  const { error } = await cliente().storage.from(bucket).uploadToSignedUrl(path, token, blob, { contentType: blob.type || "image/webp" });
  if (error) throw new Error("Falha ao enviar a imagem: " + error.message);
}

/** Sobe o print do depósito (comprimido) e devolve o caminho no bucket privado. */
export async function enviarPrint(sorteioId: string, file: File): Promise<string> {
  const blob = await comprimirImagem(file);
  const res = await fetch("/api/participar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao: "link", sorteioId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Não foi possível enviar o print.");
  await enviar("prints", json.path, json.token, blob);
  return json.path as string;
}

/** Sobe a imagem de um prêmio (painel) e devolve a URL pública. */
export async function enviarImagemPremio(file: File): Promise<string> {
  // GIF e arquivos pequenos vão como estão; o resto é comprimido sem perder qualidade visível
  const blob = file.type === "image/gif" || file.size < 600_000 ? file : await comprimirImagem(file, 1400, 0.9);
  const { path, token, publicUrl } = await adminApi<{ path: string; token: string; publicUrl: string }>("linkImagem", {
    tipoArquivo: blob.type || file.type,
  });
  await enviar("premios", path, token, blob);
  return publicUrl;
}
