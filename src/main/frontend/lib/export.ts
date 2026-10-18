/** "Lähetä Valmentajalle" / "Send to coach" text and Treenipäiväkirja-style CSV export. Pure module. */
import { dayLabel, type Lang } from './i18n';
import { fmtKg } from './num';
import { parseText } from './parser';

export interface ExportSession {
  date: string; // YYYY-MM-DD
  title: string; // workout type, e.g. "Yläkroppa" / "Upper body"
  abWeek?: string; // "A" | "B" | ""
  text: string;
}

/** "2026-10-14" -> "Ke 14.10" (kept for compatibility; see i18n.dayLabel). */
export function fiDayLabel(iso: string): string {
  return dayLabel(iso, 'fi');
}

/** The text that goes to the coach's chat: a localized header line + the log lines as written. */
export function toCoachText(s: ExportSession, lang: Lang = 'fi'): string {
  const lines = s.text
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1]));
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return [`${dayLabel(s.date, lang)} ${s.title}`.trim(), ...lines].join('\n');
}

/** Canonical column keys, in Treenipäiväkirja order (date, A/B week, workout type, exercise, set, reps, kg, notes). */
export const CSV_COLUMNS = ['date', 'ab_week', 'workout_type', 'exercise', 'set', 'reps', 'kg', 'notes'] as const;

/** Localized headers, same order as CSV_COLUMNS. */
export const CSV_HEADERS: Record<Lang, string[]> = {
  fi: ['päivämäärä', 'ab_viikko', 'treenityyppi', 'liike', 'sarja', 'toistot', 'kg', 'muistiinpanot'],
  en: ['date', 'ab_week', 'workout_type', 'exercise', 'set', 'reps', 'kg', 'notes'],
};

const WARMUP_NOTE: Record<Lang, string> = { fi: 'lämmittely', en: 'warm-up' };

function csvCell(v: string, sep: string): string {
  return /["\n\r]/.test(v) || v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v;
}

export interface CsvOptions {
  /** Active UI language: localized headers + notes, and its default separator/decimal. */
  lang?: Lang;
  sep?: string;
  decimalComma?: boolean;
}

/**
 * One row per set, Treenipäiväkirja column order.
 * - lang 'fi': Finnish headers, ';' separator, decimal comma (Finnish spreadsheet locale)
 * - lang 'en': English headers, ',' separator, decimal point
 * - no lang (legacy/machine): canonical column keys, ';' + decimal comma
 */
export function toCsv(sessions: ExportSession[], opts: CsvOptions = {}): string {
  const lang = opts.lang;
  const sep = opts.sep ?? (lang === 'en' ? ',' : ';');
  const dc = opts.decimalComma ?? lang !== 'en';
  const warm = WARMUP_NOTE[lang ?? 'fi'];
  const rows: string[][] = [lang ? [...CSV_HEADERS[lang]] : [...CSV_COLUMNS]];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    const counters = new Map<string, number>();
    for (const line of parseText(s.text)) {
      if (line.kind !== 'exercise' || !line.exercise) continue;
      for (const set of line.sets) {
        const n = (counters.get(line.exercise) ?? 0) + 1;
        counters.set(line.exercise, n);
        const notes = [set.warmup ? warm : '', line.note].filter(Boolean).join('; ');
        rows.push([
          s.date,
          s.abWeek ?? '',
          s.title,
          line.exercise,
          String(n),
          String(set.reps),
          dc ? fmtKg(set.kg, 'fi') : String(set.kg),
          notes,
        ]);
      }
    }
  }
  return rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join('\r\n') + '\r\n';
}
