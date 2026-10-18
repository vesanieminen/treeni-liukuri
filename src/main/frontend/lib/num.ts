/** Finnish number helpers: "82,5" <-> 82.5. */

/** Parses "82,5", "82.5", "80" into a number; returns null if the string is not a plain number. */
export function parseFiNumber(raw: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return null;
  return Number(raw.replace(',', '.'));
}

/** Formats a weight Finnish-style: 82.5 -> "82,5", 80 -> "80". */
export function fmtKg(kg: number): string {
  const rounded = Math.round(kg * 100) / 100;
  return String(rounded).replace('.', ',');
}

/** True when the raw numeric token carries a decimal part ("82,5", "17.5"). */
export function hasDecimal(raw: string): boolean {
  return /[.,]\d/.test(raw);
}
