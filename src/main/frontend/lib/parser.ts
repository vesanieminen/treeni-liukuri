/**
 * Muistio parser – turns Notes-style gym shorthand into weight × reps sets.
 *
 * Pure module: no DOM, no storage. See SCOPE.md § "Parser grammar" for the rules and examples.
 *
 *   "Kyykky 80 9 8 10"            -> 80×9, 80×8, 80×10
 *   "Vinopenkki KP 27,5 8 25 8 8" -> 27,5×8, 25×8, 25×8   (25 looks like a weight -> new weight)
 *   "Ylätalja 60 10 70 8 8"       -> 60×10 (lämmittely), 70×8, 70×8
 *   "Hauis scott 30 10 35 108"    -> 30×10, 35×? + question "108 = 10 + 8?"
 */
import { fmtKg, hasDecimal, parseFiNumber } from './num';

/** Largest plain integer that is read as a rep count. Bigger integers are read as a weight. */
export const MAX_REPS = 20;

export interface ParsedSet {
  kg: number;
  reps: number;
  /** Lighter set before the heaviest weight on the line (ramp-up / lämmittely). */
  warmup: boolean;
}

export interface Fix {
  /** Stable id for UI translation: split = read as reps, asWeight = read as kg, remove = delete token. */
  id: 'split' | 'asWeight' | 'remove';
  /** Default (Finnish) button label; the UI translates by `id`. */
  label: string;
  /** Text that replaces the token range [start, end) of the line. */
  replacement: string;
}

export type IssueKind = 'split-reps' | 'missing-reps' | 'unknown';

export interface Issue {
  kind: IssueKind;
  /** Character range of the offending token inside the raw line. */
  start: number;
  end: number;
  raw: string;
  /** Default question text (language neutral for split-reps, Finnish otherwise); the UI translates by `kind`. */
  message: string;
  /** split-reps: the suggested rep counts, e.g. [10, 8]. */
  split?: number[];
  /** missing-reps: the weight that has no reps. */
  kg?: number;
  fixes: Fix[];
}

export type LineKind = 'empty' | 'header' | 'exercise';

export interface ParsedLine {
  raw: string;
  kind: LineKind;
  /** Exercise name as written ("Vinopenkki KP"). For continuation lines, the previous exercise. */
  exercise: string | null;
  /** True when the line had no name and continues the exercise of the previous line. */
  continuation: boolean;
  sets: ParsedSet[];
  /** A weight that has no reps yet ("35 × ?"). */
  pendingKg: number | null;
  /** Weight in effect at the end of the line (used when appending sets). */
  currentKg: number | null;
  /** Free words on the line that are not part of the name ("syvä", "kevyt", "# kommentti"). */
  note: string;
  issues: Issue[];
}

interface Token {
  text: string;
  start: number;
  end: number;
}

const BULLET = /^(\s*(?:[-•*–]\s+|\d+[.)]\s+))/;
const NUM = /^\d+(?:[.,]\d+)?$/;
const NUM_KG = /^(@)?(\d+(?:[.,]\d+)?)(kg)?$/i;
const TIMES = /^(\d+(?:[.,]\d+)?)[x×*](\d+)(?:[x×*](\d+))?$/i;
const NON_KG_UNIT = /^(km|m|mi|min|mins|s|sec|sek|h|kcal|cal|w)$/i;
/** Bodyweight markers, Finnish and English. */
const BODYWEIGHT = /^(bw|keho|oma|body|bodyweight)$/i;

function tokenize(line: string, from: number): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

function isNumericish(t: string): boolean {
  return NUM_KG.test(t) || TIMES.test(t) || BODYWEIGHT.test(t);
}

/** All ways to read a digit run as several rep counts (1..MAX_REPS, no leading zeros), fewest parts first. */
export function splitIntoReps(digits: string): number[][] {
  const out: number[][] = [];
  const walk = (rest: string, acc: number[]) => {
    if (!rest.length) {
      if (acc.length >= 2) out.push(acc);
      return;
    }
    for (let len = 1; len <= Math.min(2, rest.length); len++) {
      const part = rest.slice(0, len);
      if (part.startsWith('0')) continue;
      const n = Number(part);
      if (n < 1 || n > MAX_REPS) continue;
      walk(rest.slice(len), [...acc, n]);
    }
  };
  if (/^\d{2,4}$/.test(digits)) walk(digits, []);
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
  return out.sort((a, b) => a.length - b.length || spread(a) - spread(b));
}

/** Whether `n` is a believable new weight given the weight currently in effect. */
function plausibleWeight(n: number, currentKg: number | null): boolean {
  if (currentKg === null || currentKg <= 0) return true;
  const ratio = n / currentKg;
  return ratio >= 0.4 && ratio <= 1.6;
}

/** Parses one line. `prevExercise` lets a name-less line ("80 8 8") continue the previous exercise. */
export function parseLine(raw: string, prevExercise: string | null = null): ParsedLine {
  const result: ParsedLine = {
    raw,
    kind: 'empty',
    exercise: null,
    continuation: false,
    sets: [],
    pendingKg: null,
    currentKg: null,
    note: '',
    issues: [],
  };
  if (!raw.trim()) return result;

  // Comments: everything after '#' or '//' is a note.
  let body = raw;
  const noteParts: string[] = [];
  const hashAt = body.search(/#|\/\//);
  if (hashAt >= 0) {
    noteParts.push(body.slice(hashAt).replace(/^(#|\/\/)\s*/, ''));
    body = body.slice(0, hashAt);
  }
  const bullet = BULLET.exec(body);
  const tokens = tokenize(body, bullet ? bullet[1].length : 0);

  const firstNum = tokens.findIndex((t) => isNumericish(t.text));
  const nameTokens = firstNum < 0 ? tokens : tokens.slice(0, firstNum);
  const rest = firstNum < 0 ? [] : tokens.slice(firstNum);

  if (!rest.length) {
    result.kind = 'header';
    result.note = [nameTokens.map((t) => t.text).join(' '), ...noteParts].filter(Boolean).join(' ');
    return result;
  }

  result.kind = 'exercise';
  if (nameTokens.length) {
    result.exercise = nameTokens.map((t) => t.text).join(' ').replace(/[:,]$/, '');
  } else {
    result.exercise = prevExercise;
    result.continuation = true;
  }

  let curKg: number | null = null;
  let curKgToken: Token | null = null;
  let curKgHasReps = false;
  let blocked = false; // an unresolved token sits between the weight and further reps

  const addReps = (reps: number, count = 1) => {
    if (curKg === null) return;
    for (let i = 0; i < count; i++) result.sets.push({ kg: curKg, reps, warmup: false });
    curKgHasReps = true;
  };
  const setWeight = (kg: number, tok: Token) => {
    if (curKg !== null && !curKgHasReps && curKgToken && !blocked) {
      result.issues.push({
        kind: 'missing-reps',
        start: curKgToken.start,
        end: curKgToken.end,
        raw: curKgToken.text,
        message: `Painolle ${fmtKg(curKg)} ei toistoja`,
        kg: curKg,
        fixes: [{ id: 'remove', label: 'Poista', replacement: '' }],
      });
    }
    curKg = kg;
    curKgToken = tok;
    curKgHasReps = false;
    blocked = false;
  };

  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i];
    const t = tok.text.replace(/[,;]+$/, '');
    const next = rest[i + 1]?.text;

    // number followed by a non-kg unit (3,4 km, 8 min) -> note, not a set
    if (NUM.test(t) && next && NON_KG_UNIT.test(next)) {
      noteParts.push(`${t} ${next}`);
      i++;
      continue;
    }
    if (BODYWEIGHT.test(t)) {
      setWeight(0, tok);
      continue;
    }
    const times = TIMES.exec(t);
    if (times) {
      const a = parseFiNumber(times[1])!;
      const b = Number(times[2]);
      const c = times[3] ? Number(times[3]) : null;
      if (c !== null) {
        // 80x3x10 -> kg × sets × reps
        setWeight(a, tok);
        addReps(c, b);
      } else if (curKg === null || hasDecimal(times[1]) || a > MAX_REPS) {
        setWeight(a, tok); // 80x8 -> kg × reps
        addReps(b);
      } else {
        addReps(b, a); // 3x10 at current weight -> sets × reps
      }
      continue;
    }
    const nk = NUM_KG.exec(t);
    if (nk) {
      const n = parseFiNumber(nk[2])!;
      const explicitKg = !!nk[1] || !!nk[3] || (next !== undefined && /^kg$/i.test(next));
      if (next !== undefined && /^kg$/i.test(next)) i++;
      if (explicitKg || curKg === null || hasDecimal(nk[2])) {
        setWeight(n, tok);
      } else if (n <= MAX_REPS) {
        if (blocked) continue; // reps after an unresolved token are ambiguous; wait for the fix
        addReps(n);
      } else {
        const splits = splitIntoReps(nk[2]);
        if (splits.length && !plausibleWeight(n, curKg)) {
          const best = splits[0];
          result.issues.push({
            kind: 'split-reps',
            start: tok.start,
            end: tok.end,
            raw: tok.text,
            message: `“${tok.text}” = ${best.join(' + ')}?`,
            split: best,
            fixes: [
              { id: 'split', label: 'Kyllä', replacement: best.join(' ') },
              { id: 'asWeight', label: `Ei, ${tok.text} kg`, replacement: `${tok.text}kg` },
            ],
          });
          blocked = true;
        } else {
          setWeight(n, tok);
        }
      }
      continue;
    }
    if (/^kg$/i.test(t)) continue;
    noteParts.push(tok.text);
  }

  // Ramp-up sets: single lighter sets (≤ 90 % of the top weight) before the first set at the top weight,
  // e.g. "Ylätalja 60 10 70 8 8". Two or more sets at a weight always count as work sets.
  if (result.sets.length > 1) {
    const max = Math.max(...result.sets.map((s) => s.kg));
    const firstMax = result.sets.findIndex((s) => s.kg === max);
    for (let i = 0; i < firstMax; i++) {
      const s = result.sets[i];
      const single = result.sets[i - 1]?.kg !== s.kg && result.sets[i + 1]?.kg !== s.kg;
      s.warmup = single && s.kg <= max * 0.9;
    }
  }

  result.currentKg = curKg;
  result.pendingKg = curKg !== null && !curKgHasReps ? curKg : null;
  result.note = noteParts.join(' ').trim();
  return result;
}

/** Parses a whole Muistio text, line by line (continuation lines inherit the previous exercise). */
export function parseText(text: string): ParsedLine[] {
  let prev: string | null = null;
  return text.split('\n').map((line) => {
    const p = parseLine(line, prev);
    if (p.kind === 'exercise' && p.exercise) prev = p.exercise;
    else if (p.kind === 'header') prev = null;
    return p;
  });
}

/** Lower-cased, whitespace-collapsed exercise key, so "vinopenkki  kp" matches "Vinopenkki KP". */
export function exerciseKey(name: string): string {
  return name.toLocaleLowerCase('fi').replace(/\s+/g, ' ').trim();
}

/** Applies a one-tap fix to a line: replaces [start, end) with the fix text and tidies spaces. */
export function applyFix(line: string, issue: Pick<Issue, 'start' | 'end'>, fix: Pick<Fix, 'replacement'>): string {
  return (line.slice(0, issue.start) + fix.replacement + line.slice(issue.end)).replace(/ {2,}/g, ' ').trimEnd();
}

/** Work sets per exercise for a whole text (lines of the same exercise are merged). */
export function setsByExercise(text: string): Map<string, { name: string; sets: ParsedSet[] }> {
  const out = new Map<string, { name: string; sets: ParsedSet[] }>();
  for (const line of parseText(text)) {
    if (line.kind !== 'exercise' || !line.exercise) continue;
    const key = exerciseKey(line.exercise);
    const entry = out.get(key) ?? { name: line.exercise, sets: [] };
    entry.sets.push(...line.sets);
    out.set(key, entry);
  }
  return out;
}

/** How a weight must be written so the parser reads it as a weight in the middle of a line. */
export function weightToken(kg: number, lang: 'fi' | 'en' = 'fi'): string {
  if (kg === 0) return 'bw';
  const s = fmtKg(kg, lang);
  return Number.isInteger(kg) && kg <= MAX_REPS ? `${s}kg` : s;
}

/**
 * Appends one logged set to the Muistio text, the way you would type it:
 * same weight -> just the reps; new weight -> "weight reps"; new exercise -> new line.
 */
export function appendSet(text: string, exercise: string, kg: number, reps: number, lang: 'fi' | 'en' = 'fi'): string {
  const lines = text.split('\n');
  const parsed = parseText(text);
  const key = exerciseKey(exercise);
  let idx = -1;
  for (let i = parsed.length - 1; i >= 0; i--) {
    const p = parsed[i];
    if (p.kind === 'exercise' && p.exercise && exerciseKey(p.exercise) === key) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    const first = kg === 0 ? 'bw' : fmtKg(kg, lang);
    const newLine = `${exercise} ${first} ${reps}`;
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return [...lines, newLine].join('\n');
  }
  const p = parsed[idx];
  const addition = p.currentKg === kg && !p.issues.some((i) => i.kind === 'split-reps') ? `${reps}` : `${weightToken(kg, lang)} ${reps}`;
  const line = lines[idx];
  const hashAt = line.search(/#|\/\//);
  lines[idx] =
    hashAt >= 0
      ? `${line.slice(0, hashAt).trimEnd()} ${addition} ${line.slice(hashAt)}`
      : `${line.trimEnd()} ${addition}`;
  return lines.join('\n');
}
