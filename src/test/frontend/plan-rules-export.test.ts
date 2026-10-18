import { describe, expect, it } from 'vitest';
import { parsePlan, parsePlanItem, fmtTarget } from '../../main/frontend/lib/plan';
import { nextTarget, rescheduleSkip } from '../../main/frontend/lib/rules';
import { fiDayLabel, toCoachText, toCsv } from '../../main/frontend/lib/export';
import { parseLine } from '../../main/frontend/lib/parser';

const COACH = `Ma 19.10 Yläkroppa 8:30–9:30
Lämpö: pyöräily 3,4 km
Ei litteää penkkiä
1. Vinopenkki KP 27,5 kg 3x8
2. Ylätalja 70 kg 3x10
3. Alataljasoutu 75 kg 3×10 lepo 90 s
4. Pystypunnerrus KP 17,5 → 15 kg 3×8–10
5. Pec deck 65 kg – kevennä jos rinta kiristää
6. Ojentaja naruilla 50 kg 3x10`;

describe('parsePlan', () => {
  const plan = parsePlan(COACH);
  it('reads title, time, warm-up and warnings', () => {
    expect(plan.title).toBe('Yläkroppa');
    expect(plan.when).toBe('Ma 19.10 · 8:30–9:30');
    expect(plan.warmup).toBe('pyöräily 3,4 km');
    expect(plan.warnings).toEqual(['Ei litteää penkkiä']);
  });
  it('reads exercises with kg, drop kg, sets×reps range, rest and note', () => {
    expect(plan.items.map((i) => i.name)).toEqual([
      'Vinopenkki KP', 'Ylätalja', 'Alataljasoutu', 'Pystypunnerrus KP', 'Pec deck', 'Ojentaja naruilla',
    ]);
    expect(plan.items[0]).toMatchObject({ kg: 27.5, sets: 3, repsMin: 8, repsMax: 8 });
    expect(plan.items[3]).toMatchObject({ kg: 17.5, kgDrop: 15, repsMin: 8, repsMax: 10 });
    expect(fmtTarget(plan.items[3])).toBe('3×8–10');
    expect(plan.items[4]).toMatchObject({ kg: 65, note: 'kevennä jos rinta kiristää' });
    expect(plan.items[2].restSec).toBe(90);
  });
  it('bare number without kg is the weight', () => {
    expect(parsePlanItem('Kyykky 90 3x9-10')).toMatchObject({ kg: 90, repsMin: 9, repsMax: 10 });
  });
});

describe('rules', () => {
  const item = parsePlanItem('Alataljasoutu 75 kg 3x10')!;
  it('+2,5 kg when all sets hit the target', () => {
    expect(nextTarget(item, parseLine('A 75 10 10 10').sets)).toEqual({ kg: 77.5, increased: true });
  });
  it('same weight when a set falls short', () => {
    expect(nextTarget(item, parseLine('A 75 10 9 10').sets)).toEqual({ kg: 75, increased: false });
  });
  it('skip moves the session without two training days in a row', () => {
    // ma 19 / ke 21 / pe 23 -> skip ma -> next free day not next to ke/pe is su 25
    expect(rescheduleSkip(['2026-10-19', '2026-10-21', '2026-10-23'], '2026-10-19')).toEqual([
      '2026-10-21', '2026-10-23', '2026-10-25',
    ]);
    // skip pe 23 -> su 25 (la 24 would be back-to-back with nothing, but su is first non-adjacent? la is adjacent to pe? pe is gone)
    expect(rescheduleSkip(['2026-10-19', '2026-10-21', '2026-10-23'], '2026-10-23')).toEqual([
      '2026-10-19', '2026-10-21', '2026-10-24',
    ]);
  });
});

describe('export', () => {
  const s = { date: '2026-10-14', title: 'Yläkroppa', abWeek: 'A', text: 'Ylätalja 60 10 70 8 8\n\nPec deck 65 8 # rinta ok\n' };
  it('day label', () => expect(fiDayLabel('2026-10-14')).toBe('Ke 14.10'));
  it('coach text = header + lines as written', () => {
    expect(toCoachText(s)).toBe('Ke 14.10 Yläkroppa\nYlätalja 60 10 70 8 8\n\nPec deck 65 8 # rinta ok');
  });
  it('CSV with Treenipäiväkirja columns, ; and decimal comma', () => {
    const csv = toCsv([{ ...s, text: 'Vinopenkki KP 27,5 8 25 8\nYlätalja 60 10 70 8' }]).split('\r\n');
    expect(csv[0]).toBe('date;ab_week;workout_type;exercise;set;reps;kg;notes');
    expect(csv[1]).toBe('2026-10-14;A;Yläkroppa;Vinopenkki KP;1;8;27,5;');
    expect(csv[3]).toBe('2026-10-14;A;Yläkroppa;Ylätalja;1;10;60;lämmittely');
    expect(toCsv([{ ...s, text: 'Penkki 82,5 5' }], { sep: ',', decimalComma: false }).split('\r\n')[1]).toBe(
      '2026-10-14,A,Yläkroppa,Penkki,1,5,82.5,',
    );
  });
});
