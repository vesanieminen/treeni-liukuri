/** Derived data for Tänään / Sarja (pure, given state). */
import { exerciseKey, setsByExercise, type ParsedSet } from './parser';
import type { PlanItem } from './plan';
import { nextTarget, workSets } from './rules';
import { history, todaySession, type AppState, type Session } from './store';

export interface ItemStatus {
  item: PlanItem;
  done: ParsedSet[];
  complete: boolean;
  last: { session: Session; sets: ParsedSet[] }[];
  /** Suggested next set (weight × reps) – "Sama kuin viimeksi". */
  same: { kg: number; reps: number } | null;
  next: ReturnType<typeof nextTarget>;
}

export function lastSessions(s: AppState, name: string, n = 3) {
  const key = exerciseKey(name);
  const out: { session: Session; sets: ParsedSet[] }[] = [];
  for (const h of history(s)) {
    const e = setsByExercise(h.text).get(key);
    if (e && workSets(e.sets).length) out.push({ session: h, sets: workSets(e.sets) });
    if (out.length >= n) break;
  }
  return out;
}

export function itemStatuses(s: AppState): ItemStatus[] {
  const sess = todaySession(s);
  const doneMap = setsByExercise(sess.text);
  return (sess.plan?.items ?? []).map((item) => {
    const done = workSets(doneMap.get(exerciseKey(item.name))?.sets ?? []);
    const last = lastSessions(s, item.name);
    const prev = last[0]?.sets ?? [];
    const idx = done.length;
    const ref = prev[idx] ?? prev[prev.length - 1];
    const same = ref ? { kg: ref.kg, reps: ref.reps } : item.kg !== null ? { kg: item.kg, reps: item.repsMax } : null;
    return { item, done, complete: done.length >= item.sets, last, same, next: nextTarget(item, done) };
  });
}
