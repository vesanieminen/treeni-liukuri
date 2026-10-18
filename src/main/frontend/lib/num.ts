/** Number helpers. Input accepts both "82,5" and "82.5"; output follows the UI language. */

/** Parses "82,5", "82.5", "80" into a number; returns null if the string is not a plain number. */
export function parseFiNumber(raw: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return null;
  return Number(raw.replace(',', '.'));
}

/** Formats a weight: fi 82.5 -> "82,5", en 82.5 -> "82.5"; integers stay "80". */
export function fmtKg(kg: number, lang: 'fi' | 'en' = 'fi'): string {
  const rounded = String(Math.round(kg * 100) / 100);
  return lang === 'fi' ? rounded.replace('.', ',') : rounded;
}

/** True when the raw numeric token carries a decimal part ("82,5", "17.5"). */
export function hasDecimal(raw: string): boolean {
  return /[.,]\d/.test(raw);
}
