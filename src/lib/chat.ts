// Regras do sorteio pelo chat da Twitch (iguais às do site Barr4k).

export type SubTier = 0 | 1 | 2 | 3;

export interface ChancesChat {
  chance_t1: number;
  chance_t2: number;
  chance_t3: number;
}

/** Quantas chances um participante tem, pelo tier do sub. Quem não é sub tem 1. */
export function chancesPorTier(tier: number, s: ChancesChat): number {
  if (tier === 3) return s.chance_t3;
  if (tier === 2) return s.chance_t2;
  if (tier === 1) return s.chance_t1;
  return 1;
}

/** Foto da Twitch ou um avatar com a inicial. */
export function avatarTwitch(login: string, url?: string | null): string {
  return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(login)}&background=7C0912&color=fff&size=128&bold=true`;
}

/**
 * A primeira palavra da mensagem precisa ser o comando. Remove os caracteres
 * invisíveis que 7TV/Chatterino colam em mensagens repetidas, e aceita texto
 * depois ("!sorteio boa sorte").
 */
export function ehComando(mensagem: string, comando: string): boolean {
  const limpa = mensagem.replace(/[\u{E0000}-\u{E007F}\u{200B}-\u{200D}\u{2060}\u{FEFF}]/gu, "").trim().toLowerCase();
  return limpa.split(/\s+/)[0] === comando.trim().toLowerCase();
}

/**
 * Tier do sub pelos badges do chat. Só o badge "subscriber" diz o tier
 * (versão 3000+ = T3, 2000+ = T2, demais = T1). Founder conta como T1.
 */
export function tierPelosBadges(badges: Record<string, string | null | undefined> | null | undefined, ehSub = false): SubTier {
  const versao = badges?.subscriber;
  if (versao !== null && versao !== undefined) {
    const n = parseInt(versao, 10) || 0;
    return n >= 3000 ? 3 : n >= 2000 ? 2 : 1;
  }
  if (ehSub || badges?.founder != null) return 1;
  return 0;
}

/** Login da Twitch válido (4–25 letras, números ou _). */
export const loginValido = (login: string) => /^[a-z0-9_]{3,25}$/.test(login);
