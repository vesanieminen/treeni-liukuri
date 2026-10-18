/** Demo data so the screens look like the mockups on first launch. Clearly marked; one tap clears it. */
import type { AppState, Session } from './store';
import { parsePlan } from './plan';
import { addDays } from './rules';

export const DEMO_PLAN_TEXT = `Yläkroppa 8:30–9:30
Lämpö: pyöräily 3,4 km
Ei litteää penkkiä
1. Vinopenkki KP 27,5 kg 3x8
2. Ylätalja 70 kg 3x10
3. Alataljasoutu 75 kg 3×10 lepo 90 s
4. Pystypunnerrus KP 17,5 → 15 kg 3×8–10
5. Pec deck 65 kg – kevennä jos rinta kiristää
6. Ojentaja naruilla 50 kg 3x10
7. Hauis scott 35 kg 3x10
8. Vipunosto 8 kg 3x10`;

export const DEMO_LOWER_TEXT = `Alakroppa 8:30–9:30
Lämpö: pyöräily 3,4 km
1. Kyykky 90 kg 3x9-10
2. Mave 92,5 kg 3x9-10
3. Jalkaprässi 140 kg 3x10
4. Reiden koukistus 45 kg 3x10
5. Pohkeet 60 kg 3x12`;

const upper = (w: number) => {
  const vk = [22.5, 22.5, 25, 25, 27.5][w];
  const pp = [15, 15, 15, 15, 17.5][w];
  const at = [70, 70, 75, 75, 75][w];
  return [
    `Vinopenkki KP ${String(vk).replace('.', ',')} 8 8 ${w === 4 ? 7 : 8}`,
    `Ylätalja 60 10 70 10 10 9`,
    `Alataljasoutu ${at} 10 ${w === 3 ? '10 8' : '9 10'}`,
    `Pystypunnerrus KP ${String(pp).replace('.', ',')} 8 8 7`,
    `Pec deck 65 8 8 7`,
    `Ojentaja naruilla 50 8 8 8`,
  ].join('\n');
};
const lower = (w: number) => {
  const mave = [80, 80, 80, 90, 92.5][w];
  const kyykky = [90, 90, 80, 80, 90][w];
  return [
    `Kyykky ${kyykky} 9 9 8${w === 2 || w === 3 ? ' # syvä' : ''}`,
    `Mave ${String(mave).replace('.', ',')} 10 9 9`,
    `Jalkaprässi 140 10 10 10`,
    `Reiden koukistus 45 10 10 9`,
  ].join('\n');
};

/** Five weeks of Mon/Wed/Fri training ending before `todayIso`, with one skip and one moved session. */
export function demoState(todayIso: string): AppState {
  const [y, m, d] = todayIso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 su
  const thisMonday = addDays(todayIso, -((dow + 6) % 7));
  const start = addDays(thisMonday, -35);
  const sessions: Session[] = [];
  let n = 0;
  for (let w = 0; w < 5; w++) {
    for (const off of [0, 2, 4]) {
      let date = addDays(start, w * 7 + off);
      const title = n % 2 === 0 ? 'Yläkroppa' : 'Alakroppa';
      if (w === 1 && off === 0) {
        sessions.push({ id: `demo-skip-${date}`, date, title, text: '', plan: null, skipped: true, readiness: 'skip' });
        date = addDays(date, 1);
      }
      let movedFrom: string | undefined;
      if (w === 3 && off === 4) {
        movedFrom = date;
        date = addDays(date, 1);
      }
      const plan = parsePlan(title === 'Yläkroppa' ? DEMO_PLAN_TEXT : DEMO_LOWER_TEXT);
      sessions.push({ id: `demo-${date}`, date, title, abWeek: w % 2 ? 'B' : 'A', text: title === 'Yläkroppa' ? upper(w) : lower(w), plan, movedFrom });
      n++;
    }
  }
  // Today: in progress (first two done, Alataljasoutu one set in), like 01-tanaan.
  sessions.push({
    id: `s-${todayIso}`,
    date: todayIso,
    title: 'Yläkroppa',
    text: 'Vinopenkki KP 27,5 8 8 7\nYlätalja 70 10 10 9\nAlataljasoutu 75 10',
    plan: parsePlan(DEMO_PLAN_TEXT),
  });
  return { version: 1, sessions, rest: null, schedule: { weekdays: [1, 3, 5], rotation: ['Yläkroppa', 'Alakroppa'] }, demo: true };
}
