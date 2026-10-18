import { describe, expect, it } from 'vitest';
import { applyFix, appendSet, parseLine, parseText, setsByExercise } from '../../main/frontend/lib/parser';
import { parsePlan, parsePlanItem } from '../../main/frontend/lib/plan';
import { CSV_HEADERS, toCoachText, toCsv } from '../../main/frontend/lib/export';
import { DICTS, dayLabel, detectLang, shortDate, translate, weekHeader } from '../../main/frontend/lib/i18n';
import { fmtKg } from '../../main/frontend/lib/num';
import { DEMO_NAMES, demoState } from '../../main/frontend/lib/demo';

const chips = (line: string) => parseLine(line).sets.map((s) => `${s.kg}×${s.reps}${s.warmup ? 'w' : ''}`);

describe('parser – English input', () => {
  it('Squat 80 9 8 10', () => {
    expect(parseLine('Squat 80 9 8 10').exercise).toBe('Squat');
    expect(chips('Squat 80 9 8 10')).toEqual(['80×9', '80×8', '80×10']);
  });
  it('decimal point and decimal comma both work regardless of language', () => {
    expect(chips('Incline DB press 27.5 8 25 8 8')).toEqual(['27.5×8', '25×8', '25×8']);
    expect(chips('Incline DB press 27,5 8 25 8 8')).toEqual(['27.5×8', '25×8', '25×8']);
  });
  it('bodyweight: bw / body / bodyweight', () => {
    expect(chips('Pull-up bw 8 7 6')).toEqual(['0×8', '0×7', '0×6']);
    expect(chips('Dips bodyweight 10 10')).toEqual(['0×10', '0×10']);
  });
  it('English notes, units and comments', () => {
    const p = parseLine('Squat 80 9 8 deep # knee fine');
    expect(p.sets).toHaveLength(2);
    expect(p.note).toBe('knee fine deep');
    const bike = parseLine('Bike 5 mi 12 mins');
    expect(bike.sets).toEqual([]);
    expect(bike.note).toBe('5 mi 12 mins');
  });
  it('ambiguity fix ids are language neutral', () => {
    const p = parseLine('Preacher curl 30 10 35 108');
    const issue = p.issues[0];
    expect(issue.split).toEqual([10, 8]);
    expect(issue.fixes.map((f) => f.id)).toEqual(['split', 'asWeight']);
    expect(translate('en', 'issue.split')).toBe('Yes');
    expect(translate('en', 'issue.asWeight', { raw: issue.raw })).toBe('No, 108 kg');
    expect(applyFix(p.raw, issue, issue.fixes[0])).toBe('Preacher curl 30 10 35 10 8');
    const missing = parseLine('Squat 60 80 8').issues[0];
    expect(missing.kind).toBe('missing-reps');
    expect(missing.kg).toBe(60);
    expect(missing.fixes[0].id).toBe('remove');
  });
  it('appendSet writes the weight in the active language', () => {
    expect(appendSet('Seated cable row 75 10', 'Seated cable row', 77.5, 8, 'en')).toBe('Seated cable row 75 10 77.5 8');
    expect(appendSet('', 'Squat', 82.5, 5, 'en')).toBe('Squat 82.5 5');
    expect(appendSet('Lateral raise 8 10', 'Lateral raise', 10, 8, 'en')).toBe('Lateral raise 8 10 10kg 8');
    expect(chips('Seated cable row 75 10 77.5 8')).toEqual(['75×10', '77.5×8']);
  });
  it('continuation lines and merging work with English names', () => {
    const lines = parseText('Deadlift 100 5\n105 5 5');
    expect(lines[1].exercise).toBe('Deadlift');
    expect(setsByExercise('Deadlift 100 5\ndeadlift 100 4').get('deadlift')!.sets).toHaveLength(2);
  });
});

describe('plan paste – English coach message', () => {
  const plan = parsePlan(`Mon 19 Oct Upper body 8:30–9:30
Warm-up: bike 3.4 km
No flat bench
1. Incline DB press 27.5 kg 3x8
2. Seated cable row 75 kg 3×10 rest 90 s
3. DB shoulder press 17.5 → 15 kg 3×8–10
4. Pec deck 65 kg – go lighter if chest feels tight
5. Squat 90 3x9-10 rest 2 min`);
  it('title, time, warm-up, warnings', () => {
    expect(plan.title).toBe('Upper body');
    expect(plan.when).toBe('Mon 19 Oct · 8:30–9:30');
    expect(plan.warmup).toBe('bike 3.4 km');
    expect(plan.warnings).toEqual(['No flat bench']);
  });
  it('items', () => {
    expect(plan.items.map((i) => i.name)).toEqual(['Incline DB press', 'Seated cable row', 'DB shoulder press', 'Pec deck', 'Squat']);
    expect(plan.items[0]).toMatchObject({ kg: 27.5, sets: 3, repsMin: 8, repsMax: 8 });
    expect(plan.items[1].restSec).toBe(90);
    expect(plan.items[2]).toMatchObject({ kg: 17.5, kgDrop: 15, repsMin: 8, repsMax: 10 });
    expect(plan.items[3].note).toBe('go lighter if chest feels tight');
    expect(plan.items[4]).toMatchObject({ kg: 90, repsMin: 9, repsMax: 10, restSec: 120 });
  });
  it('US-style date and a warning as first line do not become the title', () => {
    expect(parsePlan('10/19 Lower body\nSquat 90 kg 3x10').title).toBe('Lower body');
    expect(parsePlan('Avoid jumping\nSquat 90 kg 3x10').warnings).toEqual(['Avoid jumping']);
    expect(parsePlanItem('Leg curl 45 kg 3x10 rest: 60 s')!.restSec).toBe(60);
  });
});

describe('i18n helpers', () => {
  it('detectLang: fi* -> fi, everything else -> en', () => {
    expect(detectLang(['fi-FI', 'en-US'])).toBe('fi');
    expect(detectLang(['fi'])).toBe('fi');
    expect(detectLang(['en-GB', 'fi'])).toBe('en');
    expect(detectLang(['sv-FI'])).toBe('en');
    expect(detectLang(['fil'])).toBe('en'); // Filipino is not Finnish
    expect(detectLang([])).toBe('en');
  });
  it('numbers and dates per locale', () => {
    expect(fmtKg(82.5, 'fi')).toBe('82,5');
    expect(fmtKg(82.5, 'en')).toBe('82.5');
    expect(fmtKg(80, 'en')).toBe('80');
    expect(dayLabel('2026-10-14', 'fi')).toBe('Ke 14.10');
    expect(dayLabel('2026-10-14', 'en')).toBe('Wed 14 Oct');
    expect(shortDate('2026-09-14', 'fi')).toBe('14.9.');
    expect(shortDate('2026-09-14', 'en')).toBe('14 Sep');
    expect(weekHeader('en')).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    expect(weekHeader('fi')[0]).toBe('ma');
  });
  it('dictionaries have the same keys and no empty strings', () => {
    expect(Object.keys(DICTS.en).sort()).toEqual(Object.keys(DICTS.fi).sort());
    for (const l of ['fi', 'en'] as const) for (const v of Object.values(DICTS[l])) expect(v.trim()).not.toBe('');
  });
  it('interpolation', () => {
    expect(translate('en', 'today.same', { kg: '75', reps: 9 })).toBe('↺ Same as last time · 75 × 9');
    expect(translate('fi', 'today.same', { kg: '75', reps: 9 })).toBe('↺ Sama kuin viimeksi · 75 × 9');
  });
});

describe('export follows the active language', () => {
  const s = { date: '2026-10-14', title: 'Upper body', abWeek: 'A', text: 'Lat pulldown 60 10 70 8 8\nPec deck 65 8' };
  it('coach text header', () => {
    expect(toCoachText(s, 'en').split('\n')[0]).toBe('Wed 14 Oct Upper body');
    expect(toCoachText({ ...s, title: 'Yläkroppa' }, 'fi').split('\n')[0]).toBe('Ke 14.10 Yläkroppa');
  });
  it('English CSV: English headers, comma separator, decimal point, same column order', () => {
    const rows = toCsv([{ ...s, text: 'Incline DB press 27.5 8\nLat pulldown 60 10 70 8' }], { lang: 'en' }).split('\r\n');
    expect(rows[0]).toBe('date,ab_week,workout_type,exercise,set,reps,kg,notes');
    expect(rows[1]).toBe('2026-10-14,A,Upper body,Incline DB press,1,8,27.5,');
    expect(rows[2]).toBe('2026-10-14,A,Upper body,Lat pulldown,1,10,60,warm-up');
  });
  it('Finnish CSV: Finnish headers, ; and decimal comma', () => {
    const rows = toCsv([{ ...s, title: 'Yläkroppa', text: 'Vinopenkki KP 27,5 8' }], { lang: 'fi' }).split('\r\n');
    expect(rows[0]).toBe(CSV_HEADERS.fi.join(';'));
    expect(rows[0]).toBe('päivämäärä;ab_viikko;treenityyppi;liike;sarja;toistot;kg;muistiinpanot');
    expect(rows[1]).toBe('2026-10-14;A;Yläkroppa;Vinopenkki KP;1;8;27,5;');
  });
});

describe('demo data is localized', () => {
  it('English demo uses English names and decimal points', () => {
    const st = demoState('2026-10-18', 'en');
    const today = st.sessions[st.sessions.length - 1];
    expect(today.title).toBe('Upper body');
    expect(today.text.split('\n')[0]).toBe('Incline DB press 27.5 8 8 7');
    expect(today.plan!.items.map((i) => i.name)).toContain('Seated cable row');
    expect(today.plan!.warnings).toEqual(['No flat bench']);
    expect(st.schedule.rotation).toEqual(['Upper body', 'Lower body']);
    expect(st.sessions.every((x) => !/[äö]/i.test(x.text + x.title))).toBe(true);
  });
  it('Finnish demo keeps Finnish names', () => {
    const st = demoState('2026-10-18', 'fi');
    expect(st.sessions[st.sessions.length - 1].text.split('\n')[0]).toBe('Vinopenkki KP 27,5 8 8 7');
    expect(DEMO_NAMES.fi.upper).toBe('Yläkroppa');
  });
});
