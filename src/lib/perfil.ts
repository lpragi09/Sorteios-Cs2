// Cadastro que a pessoa preenche depois de entrar com o Google (nome e WhatsApp).

/** Só os números do WhatsApp, com DDD e sem o 55 do Brasil. Vazio se não for um número válido. */
export function limparWhatsapp(valor: string) {
  let d = valor.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return /^[1-9]{2}9?\d{8}$/.test(d) ? d : "";
}

/** (11) 98765-4321 */
export function formatarWhatsapp(d: string | null | undefined) {
  if (!d) return "";
  const n = d.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : "";
  const ddd = n.slice(0, 2);
  const resto = n.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  return resto.length > corte ? `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}` : `(${ddd}) ${resto}`;
}

export const limparNome = (valor: string) => valor.replace(/\s+/g, " ").trim().slice(0, 60);
