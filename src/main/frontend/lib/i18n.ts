/**
 * Lightweight i18n: fi + en dictionaries, locale-aware numbers and dates, language choice.
 *
 * Language = the user's saved choice (localStorage `treeni-liukuri/lang`) if any, otherwise the
 * browser locale (navigator.languages[0] / navigator.language: fi* -> Finnish, else English).
 */
import { useSyncExternalStore } from 'react';
import { fmtKg } from './num';

export type Lang = 'fi' | 'en';
export const LANGS: Lang[] = ['fi', 'en'];
export const LANG_KEY = 'treeni-liukuri/lang';

/** Picks the initial language from browser preferences: first preference fi* -> fi, else en. */
export function detectLang(prefs: readonly (string | undefined)[]): Lang {
  const first = prefs.find((p) => !!p);
  return first && /^fi\b|^fi[-_]/i.test(first) ? 'fi' : 'en';
}

function browserPrefs(): string[] {
  if (typeof navigator === 'undefined') return [];
  return [...(navigator.languages ?? []), navigator.language].filter(Boolean);
}

function storedLang(): Lang | null {
  try {
    // Literal key on purpose: this can run before module-level constants are initialized.
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('treeni-liukuri/lang') : null;
    return v === 'fi' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

// Resolved lazily so that other modules can call getLang() during their own initialisation,
// independent of the bundler's module evaluation order.
let current: Lang | undefined;
const listeners = new Set<() => void>();

function applyDocumentLang() {
  if (typeof document !== 'undefined') document.documentElement.lang = getLang();
}
applyDocumentLang();

/** Saved manual choice, else the browser locale. */
export function getLang(): Lang {
  if (!current) current = storedLang() ?? detectLang(browserPrefs());
  return current;
}

/**
 * Manual choice: saved and used from now on, overriding the browser locale.
 * UI code should call store.changeLanguage(), which also re-creates localized demo data.
 */
export function setLang(next: Lang) {
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* private mode */
  }
  if (next === getLang()) return;
  current = next;
  applyDocumentLang();
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getLang(),
  );
}

const fi = {
  'tab.today': 'Tänään',
  'tab.log': 'Muistio',
  'tab.progress': 'Kehitys',
  'tab.program': 'Ohjelma',

  'demo.banner': 'Esimerkkidataa (demo) – kaikki tallentuu vain tähän selaimeen.',
  'demo.clear': 'Tyhjennä',
  'demo.clearConfirm': 'Poistetaanko demodata? Aloitat tyhjästä.',

  'timer.rest': 'LEPO',
  'timer.done': 'VALMIS',
  'timer.stop': 'Lopeta lepo',

  'today.title': 'Tänään',
  'today.skipped': 'Treeni siirretty – lepopäivä',
  'today.noPlan1': 'Ei vielä päivän listaa.',
  'today.noPlan2': 'Liitä Valmentajan viesti Muistiossa – tai kirjoita sarjat suoraan sinne.',
  'today.fromCoach': '✓ Valmentajalta',
  'today.tired': 'Väsynyt – kevennä',
  'today.progress': '{done} / {total} liikettä',
  'today.warmup': 'lämpö: {w}',
  'today.minsLeft': '~{n} min jäljellä',
  'today.allDone': 'Valmis 🎉',
  'today.last': 'viimeksi {r}',
  'today.same': '↺ Sama kuin viimeksi · {kg} × {reps}',
  'today.hint': 'Kun {sets}×{reps} menee → ensi kerralla {kg} kg',
  'today.nextUp': ' · ↑ ensi kerralla {kg}',

  'set.of': 'Sarja {n} / {total} · tavoite {target} · lepo {rest} s',
  'set.weight': 'Paino',
  'set.reps': 'Toistot',
  'set.history': 'Aiemmin',
  'set.log': 'Kirjaa sarja · lepo alkaa',
  'set.tip': 'Katkoviiva = viime kerta',
  'common.close': 'Sulje',

  'log.title': 'Muistio',
  'log.sub1': 'Kirjoita kuten Notesiin:',
  'log.subMono': 'liike paino toistot…',
  'log.sub2': 'Uusi paino kesken rivin vaihtaa painon.',
  'log.placeholder': 'Kyykky 80 9 8 10',
  'log.newLine': '+ uusi rivi',
  'log.line': 'Rivi {n}',
  'log.warmupTitle': 'lämmittely',
  'log.pastePlan': '⇣ Liitä Valmentajan lista',
  'log.send': 'Lähetä Valmentajalle ⇡',
  'log.foot': 'Teksti jaetaan / kopioidaan Valmentajan chattiin',
  'log.csvToday': 'CSV tänään',
  'log.csvAll': 'CSV kaikki',
  'log.copied': 'Kopioitu – liitä Valmentajan chattiin',
  'log.copyFailed': 'Kopiointi ei onnistunut',
  'issue.split': 'Kyllä',
  'issue.asWeight': 'Ei, {raw} kg',
  'issue.missingReps': 'Painolle {kg} ei toistoja',
  'issue.remove': 'Poista',

  'plan.title': 'Valmentajan lista',
  'plan.sub': 'Liitä aamun viesti – siitä tulee Tänään-lista',
  'plan.fromClipboard': '⇣ Liitä leikepöydältä',
  'plan.clipboardFailed': 'Leikepöytää ei voitu lukea – liitä tekstikenttään',
  'plan.placeholder': 'Yläkroppa 8:30–9:30\nEi litteää penkkiä\n1. Vinopenkki KP 27,5 kg 3x8\n2. Ylätalja 70 kg 3x10',
  'plan.count': '{n} liikettä',
  'plan.workout': 'Treeni',
  'plan.use': 'Käytä tänään',
  'plan.saved': 'Lista tallennettu: {n} liikettä',

  'progress.title': 'Kehitys',
  'progress.workouts': 'treeniä',
  'progress.restMoved': 'lepoa / siirtoa',
  'progress.kgIn': 'kg · {name}',
  'progress.rhythm': 'Rytmi',
  'progress.week': 'vk {n}',
  'progress.lower': 'Alakroppa',
  'progress.upper': 'Yläkroppa',
  'progress.restSkip': 'Lepo / skip',
  'progress.moved': 'Siirretty',
  'progress.gains': 'Nousut',
  'progress.empty': 'Kirjaa vähintään kaksi treeniä, niin nousut näkyvät tässä.',
  'progress.next': 'Seuraava: {kg} × {reps}',

  'program.title': 'Ohjelma',
  'program.eyebrow': 'Hypertrofia · {days}',
  'program.ready': 'Miltä tuntuu tänään?',
  'program.good': 'Hyvä',
  'program.goodSub': 'mennään',
  'program.tired': 'Väsynyt',
  'program.tiredSub': 'ei nostoja',
  'program.skip': 'Skippaan',
  'program.skipSub': 'siirrä',
  'program.skipNote':
    'Skippaus siirtää treenin seuraavaan vapaaseen päivään — ei kahta kovaa päivää putkeen. Kerro Valmentajalle Muistion “Lähetä”-napilla.',
  'program.thisWeek': 'Tämä viikko',
  'program.exercises': '{n} liikettä',
  'program.rotation': 'vuorottelu jatkuu',
  'program.moved': 'Siirretty',
  'program.today': 'Tänään',
  'program.next': 'Seuraava',
  'program.rules': 'Säännöt',
  'program.ruleUp': 'Kaikki sarjat tavoitteeseen → +2,5 kg seuraavalla kerralla.',
  'program.ruleWarmup': 'Lämpö: {w}.',
  'program.defaultWarmup': 'pyöräily 3,4 km oletuksena, muuten 5–8 min kuntopyörä',
  'program.source': 'Päivittyy Valmentajan listasta (Muistio → Liitä)',
  'program.language': 'Kieli · Language',
  'program.loadDemo': 'Lataa demo',
  'program.loadDemoConfirm': 'Ladataanko demodata? Nykyiset merkinnät korvataan.',
  'program.clearAll': 'Tyhjennä kaikki',
  'program.clearAllConfirm': 'Poistetaanko kaikki merkinnät tästä selaimesta?',

  'csv.warmup': 'lämmittely',
  'title.default': 'Treeni',
};

export type MsgKey = keyof typeof fi;

const en: Record<MsgKey, string> = {
  'tab.today': 'Today',
  'tab.log': 'Log',
  'tab.progress': 'Progress',
  'tab.program': 'Program',

  'demo.banner': 'Sample data (demo) – everything is stored only in this browser.',
  'demo.clear': 'Clear',
  'demo.clearConfirm': 'Remove the demo data? You will start from scratch.',

  'timer.rest': 'REST',
  'timer.done': 'DONE',
  'timer.stop': 'Stop rest',

  'today.title': 'Today',
  'today.skipped': 'Session moved – rest day',
  'today.noPlan1': 'No plan for today yet.',
  'today.noPlan2': "Paste the coach's message in Log – or type your sets straight there.",
  'today.fromCoach': '✓ From coach',
  'today.tired': 'Tired – go lighter',
  'today.progress': '{done} / {total} exercises',
  'today.warmup': 'warm-up: {w}',
  'today.minsLeft': '~{n} min left',
  'today.allDone': 'Done 🎉',
  'today.last': 'last {r}',
  'today.same': '↺ Same as last time · {kg} × {reps}',
  'today.hint': 'Hit {sets}×{reps} → next time {kg} kg',
  'today.nextUp': ' · ↑ next time {kg}',

  'set.of': 'Set {n} / {total} · target {target} · rest {rest} s',
  'set.weight': 'Weight',
  'set.reps': 'Reps',
  'set.history': 'Previously',
  'set.log': 'Log set · start rest',
  'set.tip': 'Dashed = last time',
  'common.close': 'Close',

  'log.title': 'Log',
  'log.sub1': 'Type like in Notes:',
  'log.subMono': 'exercise weight reps…',
  'log.sub2': 'A new weight mid-line switches the weight.',
  'log.placeholder': 'Squat 80 9 8 10',
  'log.newLine': '+ new line',
  'log.line': 'Line {n}',
  'log.warmupTitle': 'warm-up',
  'log.pastePlan': "⇣ Paste coach's plan",
  'log.send': 'Send to coach ⇡',
  'log.foot': "The text is shared / copied to the coach's chat",
  'log.csvToday': 'CSV today',
  'log.csvAll': 'CSV all',
  'log.copied': "Copied – paste it into the coach's chat",
  'log.copyFailed': 'Copy failed',
  'issue.split': 'Yes',
  'issue.asWeight': 'No, {raw} kg',
  'issue.missingReps': 'No reps for {kg}',
  'issue.remove': 'Remove',

  'plan.title': "Coach's plan",
  'plan.sub': "Paste this morning's message – it becomes the Today list",
  'plan.fromClipboard': '⇣ Paste from clipboard',
  'plan.clipboardFailed': "Couldn't read the clipboard – paste into the text box",
  'plan.placeholder': 'Upper body 8:30–9:30\nNo flat bench\n1. Incline DB press 27.5 kg 3x8\n2. Lat pulldown 70 kg 3x10',
  'plan.count': '{n} exercises',
  'plan.workout': 'Workout',
  'plan.use': 'Use today',
  'plan.saved': 'Plan saved: {n} exercises',

  'progress.title': 'Progress',
  'progress.workouts': 'workouts',
  'progress.restMoved': 'rest / moved',
  'progress.kgIn': 'kg · {name}',
  'progress.rhythm': 'Rhythm',
  'progress.week': 'wk {n}',
  'progress.lower': 'Lower body',
  'progress.upper': 'Upper body',
  'progress.restSkip': 'Rest / skip',
  'progress.moved': 'Moved',
  'progress.gains': 'Gains',
  'progress.empty': 'Log at least two workouts to see your gains here.',
  'progress.next': 'Next: {kg} × {reps}',

  'program.title': 'Program',
  'program.eyebrow': 'Hypertrophy · {days}',
  'program.ready': 'How do you feel today?',
  'program.good': 'Good',
  'program.goodSub': "let's go",
  'program.tired': 'Tired',
  'program.tiredSub': 'no heavy lifts',
  'program.skip': 'Skip',
  'program.skipSub': 'move it',
  'program.skipNote':
    'Skipping moves the session to the next free day — never two hard days in a row. Tell your coach with the “Send” button in Log.',
  'program.thisWeek': 'This week',
  'program.exercises': '{n} exercises',
  'program.rotation': 'rotation continues',
  'program.moved': 'Moved',
  'program.today': 'Today',
  'program.next': 'Next',
  'program.rules': 'Rules',
  'program.ruleUp': 'All sets hit the target → +2.5 kg next time.',
  'program.ruleWarmup': 'Warm-up: {w}.',
  'program.defaultWarmup': 'bike 3.4 km by default, otherwise 5–8 min on the exercise bike',
  'program.source': "Updated from the coach's plan (Log → Paste)",
  'program.language': 'Language · Kieli',
  'program.loadDemo': 'Load demo',
  'program.loadDemoConfirm': 'Load the demo data? Your current entries will be replaced.',
  'program.clearAll': 'Clear all',
  'program.clearAllConfirm': 'Delete all entries from this browser?',

  'csv.warmup': 'warm-up',
  'title.default': 'Workout',
};

export const DICTS: Record<Lang, Record<MsgKey, string>> = { fi, en };

/** Translates a key with {param} interpolation. */
export function translate(l: Lang, key: MsgKey, params: Record<string, string | number> = {}): string {
  const s = DICTS[l][key] ?? DICTS.fi[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

/** Hook: current language + bound helpers. */
export function useT() {
  const l = useLang();
  return {
    lang: l,
    t: (key: MsgKey, params?: Record<string, string | number>) => translate(l, key, params),
    kg: (n: number) => fmtKg(n, l),
    day: (iso: string) => dayLabel(iso, l),
  };
}

export const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  fi: ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, dow: new Date(y, m - 1, d).getDay() };
}

/** "2026-10-14" -> fi "Ke 14.10", en "Wed 14 Oct". */
export function dayLabel(iso: string, l: Lang): string {
  const { m, d, dow } = parts(iso);
  const wd = WEEKDAYS_SHORT[l][dow];
  return l === 'fi' ? `${wd[0].toUpperCase()}${wd.slice(1)} ${d}.${m}` : `${wd} ${d} ${MONTHS_EN[m - 1]}`;
}

/** Short date without weekday: fi "14.9.", en "14 Sep". */
export function shortDate(iso: string, l: Lang): string {
  const { m, d } = parts(iso);
  return l === 'fi' ? `${d}.${m}.` : `${d} ${MONTHS_EN[m - 1]}`;
}

/** Weekday name (short, lower-case fi / capitalised en) for a JS weekday 0 = Sunday. */
export function weekdayName(dow: number, l: Lang): string {
  return WEEKDAYS_SHORT[l][dow];
}

/** Monday-first weekday header for grids. */
export function weekHeader(l: Lang): string[] {
  const w = WEEKDAYS_SHORT[l];
  return [...w.slice(1), w[0]].map((x) => (l === 'en' ? x.slice(0, 2) : x));
}
