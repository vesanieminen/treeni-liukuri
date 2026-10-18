/** Kehitys calculations (pure). */
import { exerciseKey, setsByExercise } from './parser';
import type { PlanItem } from './plan';
import { addDays, nextTarget, workSets } from './rules';
import type { Session } from './store';

export interface LiftTrend {
  name: string;
  points: { date: string; kg: number }[];
  delta: number;
  note: string;
  next: { kg: number | null; reps: string } | null;
}

/** ISO 8601 week number. */
export function isoWeek(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return addDays(iso, -((dow + 6) % 7));
}

/** Top work-set weight per session for each exercise, oldest first; most frequent lifts first. */
export function liftTrends(sessions: Session[], preferred: string[] = [], limit = 4): LiftTrend[] {
  const map = new Map<string, LiftTrend & { item?: PlanItem; lastSets?: ReturnType<typeof workSets> }>();
  for (const s of [...sessions].filter((x) => !x.skipped).sort((a, b) => a.date.localeCompare(b.date))) {
    for (const [key, e] of setsByExercise(s.text)) {
      const ws = workSets(e.sets);
      if (!ws.length) continue;
      const t = map.get(key) ?? { name: e.name, points: [], delta: 0, note: '', next: null };
      t.points.push({ date: s.date, kg: Math.max(...ws.map((x) => x.kg)) });
      t.item = s.plan?.items.find((i) => exerciseKey(i.name) === key) ?? t.item;
      t.lastSets = ws;
      const n = s.text.split('\n').find((l) => exerciseKey(l).startsWith(key) && l.includes('#'));
      if (n) t.note = n.split('#')[1].trim();
      map.set(key, t);
    }
  }
  const pref = preferred.map(exerciseKey);
  const all = [...map.entries()]
    .filter(([, t]) => t.points.length >= 2)
    .sort(([ka, a], [kb, b]) => {
      const pa = pref.indexOf(ka), pb = pref.indexOf(kb);
      if (pa !== pb) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
      return b.points.length - a.points.length;
    })
    .slice(0, limit);
  return all.map(([, t]) => {
    const first = t.points[0].kg, last = t.points[t.points.length - 1].kg;
    let next: LiftTrend['next'] = null;
    if (t.item && t.lastSets) {
      const nt = nextTarget({ ...t.item, kg: last }, t.lastSets);
      next = { kg: nt.kg, reps: t.item.repsMin === t.item.repsMax ? `${t.item.sets}×${t.item.repsMax}` : `${t.item.repsMin}–${t.item.repsMax}` };
    }
    return { name: t.name, points: t.points, delta: last - first, note: t.note, next };
  });
}

/** Sparkline polyline points for a 120×40 box. */
export function sparkline(values: number[], w = 120, h = 40, pad = 6): string {
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = 4 + (i * (w - 8)) / Math.max(1, values.length - 1);
      const y = max === min ? h / 2 : h - pad - ((v - min) / span) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
