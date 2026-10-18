/**
 * Valmentajan lista / coach's plan -> today's plan. Pure module; Finnish and English input.
 *
 * Accepts the coach's 7:15 message pasted as text, e.g.
 *   Ma 19.10 Yläkroppa 8:30–9:30
 *   Lämpö: pyöräily 3,4 km
 *   Ei litteää penkkiä
 *   1. Vinopenkki KP 27,5 kg 3x8
 *   2. Pystypunnerrus KP 17,5 → 15 kg 3×8–10
 *   3. Pec deck 65 kg – kevennä jos rinta kiristää
 */
import { parseFiNumber } from './num';

export interface PlanItem {
  name: string;
  /** Start weight. */
  kg: number | null;
  /** Fallback / drop weight ("17,5 → 15"). */
  kgDrop: number | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  note: string;
}

export interface Plan {
  title: string;
  /** Free-text date/time line from the coach ("Ma 19.10 · 8:30–9:30"). */
  when: string;
  warmup: string;
  warnings: string[];
  items: PlanItem[];
}

export const DEFAULT_REST_SEC = 90;

const SETS_REPS = /(\d+)\s*[x×*]\s*(\d+)(?:\s*[–-]\s*(\d+))?/i;
const KG = /(\d+(?:[.,]\d+)?)\s*(?:(?:→|->|>)\s*(\d+(?:[.,]\d+)?))?\s*kg/i;
const BARE_NUM = /(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s*(?:→|->|>)\s*(\d+(?:[.,]\d+)?))?(?=\s|$)/;
const REST = /(?:lepo|rest)\s*:?\s*(\d+)\s*(s|sec|sek|min)?/i;
const WD = '(?:ma|ti|ke|to|pe|la|su|mon|tue|wed|thu|fri|sat|sun)[a-z]*';
const MON_EN = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
/** 19.10. / 19.10.2026 / 10/19 / 19 Oct / Oct 19, optionally with a fi/en weekday in front. */
const DATE = new RegExp(
  `\\b(?:${WD}\\.?,?\\s*)?(?:\\d{1,2}\\.\\d{1,2}\\.?(?:\\d{2,4})?|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?|\\d{1,2}\\s+${MON_EN}|${MON_EN}\\s+\\d{1,2})`,
  'i',
);
const TIME = /\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}|\b(?:klo|at)\s*\d{1,2}(?:[:.]\d{2})?/i;
/** Lines that are warnings/instructions rather than a title: "Ei …", "No flat bench", "Avoid …". */
const WARNING_START = /^(ei|älä|vältä|no|avoid|don'?t|do not|skip|!)\b/i;
const WARMUP_START = /^(lämpö|lämmittely|alkulämpö|warm[\s-]?up)/i;

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-•*–]\s+|\d+[.)]\s+)/, '').trim();
}

/** Parses one exercise line of the plan; returns null when the line has no numbers. */
export function parsePlanItem(line: string): PlanItem | null {
  const text = stripBullet(line);
  const firstDigit = text.search(/\d/);
  if (firstDigit <= 0) return null;
  const name = text.slice(0, firstDigit).replace(/[\s:,–-]+$/, '').trim();
  if (!name) return null;
  let rest = text.slice(firstDigit);

  let restSec = DEFAULT_REST_SEC;
  const rm = REST.exec(rest);
  if (rm) {
    restSec = Number(rm[1]) * (rm[2]?.startsWith('min') ? 60 : 1);
    rest = rest.replace(rm[0], ' ');
  }
  let sets = 3,
    repsMin = 10,
    repsMax = 10;
  const sr = SETS_REPS.exec(rest);
  if (sr) {
    sets = Number(sr[1]);
    repsMin = Number(sr[2]);
    repsMax = sr[3] ? Number(sr[3]) : repsMin;
    rest = rest.replace(sr[0], ' ');
  }
  let kg: number | null = null,
    kgDrop: number | null = null;
  const km = KG.exec(rest) ?? BARE_NUM.exec(rest);
  if (km) {
    kg = parseFiNumber(km[1]);
    kgDrop = km[2] ? parseFiNumber(km[2]) : null;
    rest = rest.replace(km[0], ' ');
  }
  const note = rest.replace(/^[\s·,;:–-]+|[\s·,;:–-]+$/g, '').replace(/\s{2,}/g, ' ');
  return { name, kg, kgDrop, sets, repsMin, repsMax, restSec, note };
}

/** Parses the whole pasted coach message. */
export function parsePlan(text: string): Plan {
  const plan: Plan = { title: '', when: '', warmup: '', warnings: [], items: [] };
  for (const rawLine of text.split('\n')) {
    const line = stripBullet(rawLine);
    if (!line) continue;
    if (WARMUP_START.test(line)) {
      plan.warmup = line.replace(/^[^:]*:\s*/, '').trim() || line;
      continue;
    }
    if (!plan.items.length && !plan.title && (DATE.test(line) || TIME.test(line) || !/\d/.test(line))) {
      const when = [line.match(DATE)?.[0], line.match(TIME)?.[0]].filter(Boolean).join(' · ');
      const title = line.replace(DATE, ' ').replace(TIME, ' ').replace(/[·,|–-]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (title && !WARNING_START.test(title)) {
        plan.title = title;
        plan.when = when.trim();
        continue;
      }
    }
    const item = parsePlanItem(line);
    if (item) plan.items.push(item);
    else plan.warnings.push(line.replace(/^!\s*/, ''));
  }
  return plan;
}

/** "3×10", "3×8–10" */
export function fmtTarget(item: Pick<PlanItem, 'sets' | 'repsMin' | 'repsMax'>): string {
  return `${item.sets}×${item.repsMin}${item.repsMax !== item.repsMin ? `–${item.repsMax}` : ''}`;
}
