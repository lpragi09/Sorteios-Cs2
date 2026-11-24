// Tipos e regras compartilhados entre servidor, home e painel.

export type TipoSorteio = "ticket" | "chat";
export type StatusTicket = "pendente" | "aprovado" | "recusado";

/** Casa parceira (tabela "parceiros", editada em Painel > Parceiros). O id vai no ticket. */
export interface Parceiro {
  id: string;
  nome: string;
  link: string;
  destaque: string | null;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
}

// Usados se a tabela não responder
export const PARCEIROS_PADRAO: Parceiro[] = [
  { id: "csgobig", nome: "CSGOBIG", link: "https://csgobig.com/r/soares", destaque: "3 caixas grátis e 5% de bônus", imagem_url: "/parceiros/csgobig.webp", ordem: 1, ativo: true },
  { id: "dastskin", nome: "DASTSKIN", link: "https://dast.skin/?ref=SOARES", destaque: "Bônus com o código SOARES", imagem_url: "/parceiros/dastskin.webp", ordem: 2, ativo: true },
];

export const PARCEIRO_COLUNAS = "id, nome, link, destaque, imagem_url, ordem, ativo";

/** Nome da casa pelo id; sem a lista, mostra o id em maiúsculas. */
export const nomeCasa = (id: string | null | undefined, lista: Pick<Parceiro, "id" | "nome">[] = PARCEIROS_PADRAO) =>
  lista.find((c) => c.id === id)?.nome ?? (id ?? "").toUpperCase();

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
  /** Foto da Twitch (chat) ou do Google (mensal). */
  foto?: string | null;
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
