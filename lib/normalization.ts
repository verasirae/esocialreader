/**
 * Remove todos os caracteres não numéricos de uma string ou número.
 * Útil para CPFs, CNPJs, CEPs, etc.
 */
export function normalizeDocumento(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\D/g, "");
}

/**
 * Normaliza um CPF para 11 dígitos, mantendo zeros à esquerda.
 */
export function normalizeCpf(value: string | number | null | undefined): string {
  const clean = normalizeDocumento(value);
  if (!clean) return "";
  return clean.padStart(11, "0");
}

/**
 * Normaliza um CNPJ para 14 dígitos, mantendo zeros à esquerda.
 */
export function normalizeCnpj(value: string | number | null | undefined): string {
  const clean = normalizeDocumento(value);
  if (!clean) return "";
  return clean.padStart(14, "0");
}

/**
 * Normaliza o CNPJ Raiz (8 dígitos).
 * Se o valor tiver mais que 8 dígitos, assume que é um CNPJ completo e extrai os 8 primeiros.
 */
export function normalizeCnpjRaiz(value: string | number | null | undefined): string {
  const clean = normalizeDocumento(value);
  if (!clean) return "";
  if (clean.length > 8) {
    return clean.substring(0, 8);
  }
  return clean.padStart(8, "0");
}
