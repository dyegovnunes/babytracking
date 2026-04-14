/**
 * Helpers de gênero para textos em pt-BR.
 *
 * Todas as funções aceitam `gender | undefined`. Quando o gênero é desconhecido,
 * retornamos uma forma neutra (preferindo masculino genérico apenas quando estritamente
 * necessário, ou omissão quando possível).
 *
 * Regras:
 * - boy  → artigo "o", contração "do", pronome "ele"
 * - girl → artigo "a", contração "da", pronome "ela"
 * - undefined → forma neutra ("de", "o(a)", "ele/ela") conforme o contexto
 */

export type Gender = 'boy' | 'girl' | undefined | null;

/** "do" / "da" / "de" (ex: "rotina ___ bebê") */
export function contractionDe(gender: Gender): 'do' | 'da' | 'de' {
  if (gender === 'boy') return 'do';
  if (gender === 'girl') return 'da';
  return 'de';
}

/** "o" / "a" / "o(a)" (ex: "___ bebê") */
export function article(gender: Gender): 'o' | 'a' | 'o(a)' {
  if (gender === 'boy') return 'o';
  if (gender === 'girl') return 'a';
  return 'o(a)';
}

/** Pronome sujeito: "ele" / "ela" / "ele(a)" */
export function pronoun(gender: Gender): 'ele' | 'ela' | 'ele(a)' {
  if (gender === 'boy') return 'ele';
  if (gender === 'girl') return 'ela';
  return 'ele(a)';
}

/** Terminação adjetiva: "o" / "a" (ex: "pront___", "calm___") */
export function adjEnding(gender: Gender): 'o' | 'a' | 'o(a)' {
  if (gender === 'boy') return 'o';
  if (gender === 'girl') return 'a';
  return 'o(a)';
}

/** Palavra completa "bebê" — em pt-BR é epiceno, mas devolve artigo contraído útil. */
export function babyWord(gender: Gender): string {
  if (gender === 'boy') return 'o bebê';
  if (gender === 'girl') return 'a bebê';
  return 'o(a) bebê';
}

/** "filho" / "filha" / "filho(a)" */
export function childWord(gender: Gender): 'filho' | 'filha' | 'filho(a)' {
  if (gender === 'boy') return 'filho';
  if (gender === 'girl') return 'filha';
  return 'filho(a)';
}

/** "pequeno" / "pequena" / "pequeno(a)" */
export function littleOne(gender: Gender): 'pequeno' | 'pequena' | 'pequeno(a)' {
  if (gender === 'boy') return 'pequeno';
  if (gender === 'girl') return 'pequena';
  return 'pequeno(a)';
}

/** Helper prático: "do Guto" / "da Ana" / "de bebê" */
export function ofName(name: string | undefined, gender: Gender): string {
  if (!name) return babyWord(gender);
  return `${contractionDe(gender)} ${name}`;
}
