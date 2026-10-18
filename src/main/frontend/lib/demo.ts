/** Demo data so the screens look like the mockups on first launch, localized fi / en. One tap clears it. */
import type { AppState, Session } from './store';
import type { Lang } from './i18n';
import { fmtKg } from './num';
import { parsePlan } from './plan';
import { addDays } from './rules';

type Names = {
  upper: string; lower: string;
  incline: string; pulldown: string; row: string; shoulder: string; pec: string; triceps: string; curl: string; lateral: string;
  squat: string; deadlift: string; legpress: string; legcurl: string; calf: string;
  warmup: string; noFlat: string; pecNote: string; deep: string;
};

export const DEMO_NAMES: Record<Lang, Names> = {
  fi: {
    upper: 'Yläkroppa', lower: 'Alakroppa',
    incline: 'Vinopenkki KP', pulldown: 'Ylätalja', row: 'Alataljasoutu', shoulder: 'Pystypunnerrus KP', pec: 'Pec deck',
    triceps: 'Ojentaja naruilla', curl: 'Hauis scott', lateral: 'Vipunosto',
    squat: 'Kyykky', deadlift: 'Mave', legpress: 'Jalkaprässi', legcurl: 'Reiden koukistus', calf: 'Pohkeet',
    warmup: 'Lämpö: pyöräily 3,4 km', noFlat: 'Ei litteää penkkiä', pecNote: 'kevennä jos rinta kiristää', deep: 'syvä',
  },
  en: {
    upper: 'Upper body', lower: 'Lower body',
    incline: 'Incline DB press', pulldown: 'Lat pulldown', row: 'Seated cable row', shoulder: 'DB shoulder press', pec: 'Pec deck',
    triceps: 'Rope pushdown', curl: 'Preacher curl', lateral: 'Lateral raise',
    squat: 'Squat', deadlift: 'Deadlift', legpress: 'Leg press', legcurl: 'Leg curl', calf: 'Calf raise',
    warmup: 'Warm-up: bike 3.4 km', noFlat: 'No flat bench', pecNote: 'go lighter if chest feels tight', deep: 'deep',
  },
};

/** Main lifts shown first in Progress (both languages). */
export const MAIN_LIFTS = [
  DEMO_NAMES.fi.deadlift, DEMO_NAMES.fi.incline, DEMO_NAMES.fi.shoulder, DEMO_NAMES.fi.squat,
  DEMO_NAMES.en.deadlift, DEMO_NAMES.en.incline, DEMO_NAMES.en.shoulder, DEMO_NAMES.en.squat,
];

export function demoPlanText(lang: Lang): string {
  const n = DEMO_NAMES[lang];
  const k = (x: number) => fmtKg(x, lang);
  const rest = lang === 'fi' ? 'lepo 90 s' : 'rest 90 s';
  return [
    `${n.upper} 8:30–9:30`,
    n.warmup,
    n.noFlat,
    `1. ${n.incline} ${k(27.5)} kg 3x8`,
    `2. ${n.pulldown} 70 kg 3x10`,
    `3. ${n.row} 75 kg 3×10 ${rest}`,
    `4. ${n.shoulder} ${k(17.5)} → 15 kg 3×8–10`,
    `5. ${n.pec} 65 kg – ${n.pecNote}`,
    `6. ${n.triceps} 50 kg 3x10`,
    `7. ${n.curl} 35 kg 3x10`,
    `8. ${n.lateral} 8 kg 3x10`,
  ].join('\n');
}

export function demoLowerText(lang: Lang): string {
  const n = DEMO_NAMES[lang];
  return [
    `${n.lower} 8:30–9:30`,
    n.warmup,
    `1. ${n.squat} 90 kg 3x9-10`,
    `2. ${n.deadlift} ${fmtKg(92.5, lang)} kg 3x9-10`,
    `3. ${n.legpress} 140 kg 3x10`,
    `4. ${n.legcurl} 45 kg 3x10`,
    `5. ${n.calf} 60 kg 3x12`,
  ].join('\n');
}

/** Five weeks of Mon/Wed/Fri training ending before `todayIso`, with one skip and one moved session. */
export function demoState(todayIso: string, lang: Lang = 'fi'): AppState {
  const n = DEMO_NAMES[lang];
  const k = (x: number) => fmtKg(x, lang);
  const upper = (w: number) => {
    const vk = [22.5, 22.5, 25, 25, 27.5][w];
    const pp = [15, 15, 15, 15, 17.5][w];
    const at = [70, 70, 75, 75, 75][w];
    return [
      `${n.incline} ${k(vk)} 8 8 ${w === 4 ? 7 : 8}`,
      `${n.pulldown} 60 10 70 10 10 9`,
      `${n.row} ${at} 10 ${w === 3 ? '10 8' : '9 10'}`,
      `${n.shoulder} ${k(pp)} 8 8 7`,
      `${n.pec} 65 8 8 7`,
      `${n.triceps} 50 8 8 8`,
    ].join('\n');
  };
  const lower = (w: number) => {
    const mave = [80, 80, 80, 90, 92.5][w];
    const sq = [90, 90, 80, 80, 90][w];
    return [
      `${n.squat} ${sq} 9 9 8${w === 2 || w === 3 ? ` # ${n.deep}` : ''}`,
      `${n.deadlift} ${k(mave)} 10 9 9`,
      `${n.legpress} 140 10 10 10`,
      `${n.legcurl} 45 10 10 9`,
    ].join('\n');
  };
  const [y, m, d] = todayIso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  const thisMonday = addDays(todayIso, -((dow + 6) % 7));
  const start = addDays(thisMonday, -35);
  const sessions: Session[] = [];
  let i = 0;
  for (let w = 0; w < 5; w++) {
    for (const off of [0, 2, 4]) {
      let date = addDays(start, w * 7 + off);
      const isUpper = i % 2 === 0;
      const title = isUpper ? n.upper : n.lower;
      if (w === 1 && off === 0) {
        sessions.push({ id: `demo-skip-${date}`, date, title, text: '', plan: null, skipped: true, readiness: 'skip' });
        date = addDays(date, 1);
      }
      let movedFrom: string | undefined;
      if (w === 3 && off === 4) {
        movedFrom = date;
        date = addDays(date, 1);
      }
      const plan = parsePlan(isUpper ? demoPlanText(lang) : demoLowerText(lang));
      sessions.push({ id: `demo-${date}`, date, title, abWeek: w % 2 ? 'B' : 'A', text: isUpper ? upper(w) : lower(w), plan, movedFrom });
      i++;
    }
  }
  // Today: in progress (first two done, the row one set in), like 01-tanaan.
  sessions.push({
    id: `s-${todayIso}`,
    date: todayIso,
    title: n.upper,
    text: `${n.incline} ${k(27.5)} 8 8 7\n${n.pulldown} 70 10 10 9\n${n.row} 75 10`,
    plan: parsePlan(demoPlanText(lang)),
  });
  return { version: 1, sessions, rest: null, schedule: { weekdays: [1, 3, 5], rotation: [n.upper, n.lower] }, demo: true };
}
