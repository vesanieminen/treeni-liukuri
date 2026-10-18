/** "Lähetä Valmentajalle" text and Treenipäiväkirja-style CSV export. Pure module. */
import { fmtKg } from './num';
import { parseText } from './parser';

export interface ExportSession {
  date: string; // YYYY-MM-DD
  title: string; // workout type, e.g. "Yläkroppa"
  abWeek?: string; // "A" | "B" | ""
  text: string;
}

const WEEKDAYS = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];

/** "2026-10-14" -> "Ke 14.10" */
export function fiDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]} ${d}.${m}`;
}

/** The text that goes to Valmentaja's chat: a header line + the Muistio lines as written. */
export function toCoachText(s: ExportSession): string {
  const lines = s.text
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1]));
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return [`${fiDayLabel(s.date)} ${s.title}`.trim(), ...lines].join('\n');
}

export const CSV_COLUMNS = ['date', 'ab_week', 'workout_type', 'exercise', 'set', 'reps', 'kg', 'notes'] as const;

function csvCell(v: string, sep: string): string {
  return /["\n\r]/.test(v) || v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * One row per set, matching the Treenipäiväkirja columns (date, A/B week, workout type, exercise,
 * set, reps, kg, notes). Default separator ';' + decimal comma (Finnish spreadsheet locale).
 */
export function toCsv(sessions: ExportSession[], opts: { sep?: string; decimalComma?: boolean } = {}): string {
  const sep = opts.sep ?? ';';
  const dc = opts.decimalComma ?? true;
  const rows: string[][] = [[...CSV_COLUMNS]];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    const counters = new Map<string, number>();
    for (const line of parseText(s.text)) {
      if (line.kind !== 'exercise' || !line.exercise) continue;
      for (const set of line.sets) {
        const n = (counters.get(line.exercise) ?? 0) + 1;
        counters.set(line.exercise, n);
        const notes = [set.warmup ? 'lämmittely' : '', line.note].filter(Boolean).join('; ');
        rows.push([
          s.date,
          s.abWeek ?? '',
          s.title,
          line.exercise,
          String(n),
          String(set.reps),
          dc ? fmtKg(set.kg) : String(set.kg),
          notes,
        ]);
      }
    }
  }
  return rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join('\r\n') + '\r\n';
}
