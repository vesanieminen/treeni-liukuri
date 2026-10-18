/**
 * Client-side store. All data lives in this browser (localStorage) – nothing is sent anywhere.
 * One source of truth per session: the Muistio text. Tänään/Sarja append to it via appendSet().
 */
import { useSyncExternalStore } from 'react';
import { appendSet } from './parser';
import type { Plan } from './plan';
import { addDays, isoDate } from './rules';
import { demoState } from './demo';

export type Readiness = 'hyva' | 'vasynyt' | 'skip';

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  abWeek?: string;
  text: string;
  plan: Plan | null;
  readiness?: Readiness;
  skipped?: boolean;
  movedFrom?: string;
}

export interface RestTimer {
  startedAt: number; // epoch ms
  seconds: number;
  exercise: string;
}

export interface AppState {
  version: 1;
  sessions: Session[];
  rest: RestTimer | null;
  /** Training weekdays (0 = su … 6 = la) and the A/B alternation of workout types. */
  schedule: { weekdays: number[]; rotation: string[] };
  demo: boolean;
}

const KEY = 'treeni-liukuri/v1';
const listeners = new Set<() => void>();
let state: AppState = load();

function load(): AppState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* corrupted storage -> start fresh */
  }
  return demoState(isoDate(new Date()));
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode – keep in memory */
  }
}

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  state = update(state);
  save();
  listeners.forEach((l) => l());
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

export const today = () => isoDate(new Date());

/** Title of the next workout in the A/B rotation, based on the latest non-skipped session. */
export function nextTitle(s: AppState, beforeDate = today()): string {
  const past = s.sessions.filter((x) => x.date < beforeDate && !x.skipped && x.title).sort((a, b) => a.date.localeCompare(b.date));
  const last = past[past.length - 1]?.title;
  const rot = s.schedule.rotation;
  const i = last ? rot.indexOf(last) : -1;
  return rot[(i + 1) % rot.length] ?? 'Treeni';
}

/** Today's session, created lazily. */
export function todaySession(s: AppState): Session {
  const d = today();
  return s.sessions.find((x) => x.date === d) ?? { id: `s-${d}`, date: d, title: nextTitle(s), text: '', plan: null };
}

export function updateToday(fn: (x: Session) => Session) {
  setState((s) => {
    const cur = todaySession(s);
    const next = fn(cur);
    const others = s.sessions.filter((x) => x.id !== cur.id);
    return { ...s, sessions: [...others, next].sort((a, b) => a.date.localeCompare(b.date)) };
  });
}

export function logSet(exercise: string, kg: number, reps: number, restSec: number) {
  updateToday((x) => ({ ...x, text: appendSet(x.text, exercise, kg, reps) }));
  setState((s) => ({ ...s, rest: { startedAt: Date.now(), seconds: restSec, exercise } }));
}

export function stopRest() {
  setState((s) => ({ ...s, rest: null }));
}

/** Sessions before `date`, newest first. */
export function history(s: AppState, date = today()): Session[] {
  return s.sessions.filter((x) => x.date < date && !x.skipped).sort((a, b) => b.date.localeCompare(a.date));
}

export function resetAll(withDemo: boolean) {
  setState(() =>
    withDemo
      ? demoState(today())
      : { version: 1, sessions: [], rest: null, schedule: { weekdays: [1, 3, 5], rotation: ['Yläkroppa', 'Alakroppa'] }, demo: false },
  );
}

export { addDays };
