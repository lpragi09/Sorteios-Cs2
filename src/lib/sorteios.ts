// Tipos e regras compartilhados entre servidor, home e painel.

export type Casa = "csgobig" | "dastskin";
export type TipoSorteio = "ticket" | "chat";
export type StatusTicket = "pendente" | "aprovado" | "recusado";

export const CASAS: { id: Casa; nome: string; link: string; destaque: string; imagem: string }[] = [
  { id: "csgobig", nome: "CSGOBIG", link: "https://csgobig.com/r/soares", destaque: "3 caixas grátis e 5% de bônus", imagem: "/parceiros/csgobig.webp" },
  // TODO: link de indicação da DASTSKIN (o Soares ainda vai mandar)
  { id: "dastskin", nome: "DASTSKIN", link: "https://dastskin.com", destaque: "Bônus com o código SOARES", imagem: "/parceiros/dastskin.webp" },
];

export const nomeCasa = (id: string | null | undefined) => CASAS.find((c) => c.id === id)?.nome ?? id ?? "";

export const CODIGO = "SOARES";

export interface Sorteio {
  id: string;
  tipo: TipoSorteio;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  valor: number | null;
  status: "aberto" | "encerrado";
  fecha_em: string | null;
  canal: string | null;
  comando: string;
  captando: boolean;
  chance_t1: number;
  chance_t2: number;
  chance_t3: number;
  criado_em: string;
}

/** O que a home recebe de cada sorteio (sem nada pesado). */
export interface SorteioPublico extends Sorteio {
  tickets: number;
  coins: number;
  chat: number;
  ganhadores: { rodada: number; nome: string }[];
}

export interface Ganhador {
  id: number;
  sorteio_id: string;
  rodada: number;
  nome: string;
  coins: number | null;
  criado_em: string;
  sorteio_titulo?: string;
  sorteio_valor?: number | null;
  fair_draw_id: string | null;
}

export const SORTEIO_COLUNAS =
  "id, tipo, titulo, descricao, imagem_url, valor, status, fecha_em, canal, comando, captando, chance_t1, chance_t2, chance_t3, criado_em";

/** Inscrições fecham quando o admin encerra ou quando passa do horário marcado. */
export function inscricoesAbertas(s: Pick<Sorteio, "status" | "fecha_em">, agora = Date.now()) {
  return s.status === "aberto" && (!s.fecha_em || new Date(s.fecha_em).getTime() > agora);
}

export const formatarReais = (v: number | null | undefined) =>
  v == null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: v % 1 ? 2 : 0 });

export const formatarNumero = (v: number | null | undefined) => (v ?? 0).toLocaleString("pt-BR");

/** "@fulano" sem espaços, arroba repetida ou link do Instagram colado. */
export function limparInstagram(valor: string) {
  const s = valor.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@+/, "");
  return s ? "@" + s.toLowerCase() : "";
}
