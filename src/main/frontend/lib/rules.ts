/** Progression and scheduling rules (Ohjelma § Säännöt). Pure module. */
import type { ParsedSet } from './parser';
import type { PlanItem } from './plan';

export const STEP_KG = 2.5;

export interface NextTarget {
  kg: number | null;
  increased: boolean;
}

/** Work sets only (ramp-up sets are ignored by the rules). */
export function workSets(sets: ParsedSet[]): ParsedSet[] {
  return sets.filter((s) => !s.warmup);
}

/**
 * "Kaikki sarjat tavoitteeseen → +2,5 kg seuraavalla kerralla."
 * All planned sets at the plan weight reached the top of the rep range -> next time +2,5 kg.
 */
export function nextTarget(item: PlanItem, done: ParsedSet[]): NextTarget {
  const kg = item.kg ?? (done.length ? Math.max(...done.map((s) => s.kg)) : null);
  if (kg === null) return { kg: null, increased: false };
  const atKg = workSets(done).filter((s) => s.kg >= kg);
  const hit = atKg.length >= item.sets && atKg.slice(0, item.sets).every((s) => s.reps >= item.repsMax);
  return hit ? { kg: kg + STEP_KG, increased: true } : { kg, increased: false };
}

/** ISO date helpers (local time, no timezone surprises). */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

/**
 * "Skippaus siirtää treenin seuraavaan vapaaseen päivään — ei kahta kovaa päivää putkeen."
 * Moves the session planned on `skipped` to the first later day that is not a training day and
 * not directly before or after another training day. Returns the new sorted list of dates (the
 * skipped date dropped if no slot is free within `horizonDays`). Alternative "roll the whole week"
 * behaviour is an open design question (SCOPE.md).
 */
export function rescheduleSkip(planned: string[], skipped: string, horizonDays = 14): string[] {
  const others = planned.filter((d) => d !== skipped).sort();
  const taken = new Set(others);
  for (let i = 1; i <= horizonDays; i++) {
    const cand = addDays(skipped, i);
    if (taken.has(cand) || taken.has(addDays(cand, -1)) || taken.has(addDays(cand, 1))) continue;
    return [...others, cand].sort();
  }
  return others;
}
