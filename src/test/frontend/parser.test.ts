import { describe, expect, it } from 'vitest';
import { appendSet, applyFix, parseLine, parseText, setsByExercise, splitIntoReps } from '../../main/frontend/lib/parser';

const chips = (line: string) => parseLine(line).sets.map((s) => `${s.kg}×${s.reps}${s.warmup ? 'w' : ''}`);

describe('parseLine – mockup examples (03-muistio)', () => {
  it('Kyykky 80 9 8 10', () => {
    const p = parseLine('Kyykky 80 9 8 10');
    expect(p.exercise).toBe('Kyykky');
    expect(chips('Kyykky 80 9 8 10')).toEqual(['80×9', '80×8', '80×10']);
    expect(p.issues).toEqual([]);
  });
  it('decimal comma weight, then a mid-line weight change', () => {
    expect(chips('Vinopenkki KP 27,5 8 25 8 8')).toEqual(['27.5×8', '25×8', '25×8']);
    expect(parseLine('Vinopenkki KP 27,5 8 25 8 8').exercise).toBe('Vinopenkki KP');
  });
  it('lighter first set before the working weight is a ramp-up set', () => {
    expect(chips('Ylätalja 60 10 70 8 8')).toEqual(['60×10w', '70×8', '70×8']);
  });
  it('drop sets are not warm-ups', () => {
    expect(chips('Pystypunnerrus KP 17,5 8 7 5')).toEqual(['17.5×8', '17.5×7', '17.5×5']);
    expect(chips('Vinopenkki KP 27,5 8 25 8')).toEqual(['27.5×8', '25×8']);
  });
  it('weight that is also a valid rep number: the first number is always weight', () => {
    expect(chips('Vipunosto 8 10 8 8')).toEqual(['8×10', '8×8', '8×8']);
  });
  it('"108" after 35 kg is flagged as 10 + 8 with one-tap fixes', () => {
    const p = parseLine('Hauis scott 30 10 35 108');
    expect(p.sets.map((s) => `${s.kg}×${s.reps}`)).toEqual(['30×10']);
    expect(p.pendingKg).toBe(35);
    expect(p.issues).toHaveLength(1);
    const issue = p.issues[0];
    expect(issue.kind).toBe('split-reps');
    expect(issue.message).toBe('“108” = 10 + 8?');
    expect(issue.fixes.map((f) => f.label)).toEqual(['Kyllä', 'Ei, 108 kg']);
    const fixed = applyFix(p.raw, issue, issue.fixes[0]);
    expect(fixed).toBe('Hauis scott 30 10 35 10 8');
    expect(chips(fixed)).toEqual(['30×10w', '35×10', '35×8']);
    const asWeight = applyFix(p.raw, issue, issue.fixes[1]);
    expect(asWeight).toBe('Hauis scott 30 10 35 108kg');
    expect(parseLine(asWeight).pendingKg).toBe(108);
  });
  it('a big number close to the current weight is just a new weight', () => {
    expect(chips('Mave 100 8 105 6')).toEqual(['100×8', '105×6']);
  });
  it('ramp-up = single lighter sets only; going heavier after work sets keeps them as work sets', () => {
    expect(chips('Kyykky 60 5 70 5 90 5 5')).toEqual(['60×5w', '70×5w', '90×5', '90×5']);
    expect(chips('Alataljasoutu 75 10 9 77,5 8')).toEqual(['75×10', '75×9', '77.5×8']);
  });
});

describe('parseLine – grammar extras', () => {
  it('82,5 and 82.5 are the same weight', () => {
    expect(chips('Penkki 82,5 5 5')).toEqual(['82.5×5', '82.5×5']);
    expect(chips('Penkki 82.5 5 5')).toEqual(['82.5×5', '82.5×5']);
  });
  it('explicit kg makes a small number a weight', () => {
    expect(chips('Vipunosto 8 10 10kg 8 8')).toEqual(['8×10w', '10×8', '10×8']);
    expect(chips('Vipunosto 8 10 10 kg 8')).toEqual(['8×10w', '10×8']);
    expect(chips('Vipunosto 8 10 @10 8')).toEqual(['8×10w', '10×8']);
  });
  it('× notation: kg×reps, sets×reps, kg×sets×reps', () => {
    expect(chips('Kyykky 80x8 8')).toEqual(['80×8', '80×8']);
    expect(chips('Kyykky 80 3x10')).toEqual(['80×10', '80×10', '80×10']);
    expect(chips('Kyykky 80×3×10')).toEqual(['80×10', '80×10', '80×10']);
    expect(chips('Kyykky 70 8 82,5x5')).toEqual(['70×8w', '82.5×5']);
  });
  it('bodyweight', () => {
    expect(chips('Leuanveto bw 8 7 6')).toEqual(['0×8', '0×7', '0×6']);
  });
  it('trailing commas, bullets and numbering are ignored', () => {
    expect(chips('- Kyykky 80 8, 8, 7')).toEqual(['80×8', '80×8', '80×7']);
    expect(parseLine('2. Kyykky 80 8').exercise).toBe('Kyykky');
  });
  it('words and comments become a note', () => {
    const p = parseLine('Kyykky 80 9 8 syvä # polvi ok');
    expect(p.sets).toHaveLength(2);
    expect(p.note).toBe('polvi ok syvä');
  });
  it('numbers with non-kg units are notes (cardio)', () => {
    const p = parseLine('Pyöräily 3,4 km 8 min');
    expect(p.kind).toBe('exercise');
    expect(p.sets).toEqual([]);
    expect(p.note).toBe('3,4 km 8 min');
  });
  it('line without numbers is a header', () => {
    expect(parseLine('Yläkroppa').kind).toBe('header');
    expect(parseLine('   ').kind).toBe('empty');
  });
  it('weight without reps mid-line is an issue; at the end it is just pending', () => {
    const p = parseLine('Kyykky 60 80 8');
    expect(p.issues.map((i) => i.kind)).toEqual(['missing-reps']);
    expect(chips('Kyykky 60 80 8')).toEqual(['80×8']);
    const typing = parseLine('Kyykky 80');
    expect(typing.issues).toEqual([]);
    expect(typing.pendingKg).toBe(80);
  });
  it('reps after an unresolved token wait for the fix', () => {
    const p = parseLine('Hauis 35 108 9');
    expect(p.sets).toEqual([]);
    expect(p.issues).toHaveLength(1);
  });
});

describe('splitIntoReps', () => {
  it('prefers fewest, most balanced parts', () => {
    expect(splitIntoReps('108')[0]).toEqual([10, 8]);
    expect(splitIntoReps('1010')[0]).toEqual([10, 10]);
    expect(splitIntoReps('888')[0]).toEqual([8, 8, 8]);
    expect(splitIntoReps('99')[0]).toEqual([9, 9]);
    expect(splitIntoReps('100')).toEqual([]);
  });
});

describe('parseText', () => {
  it('a name-less line continues the previous exercise', () => {
    const lines = parseText('Kyykky 80 8\n85 6 6\nYläkroppa\n90 5');
    expect(lines[1].exercise).toBe('Kyykky');
    expect(lines[1].continuation).toBe(true);
    expect(lines[3].exercise).toBe(null);
  });
  it('merges sets per exercise case-insensitively', () => {
    const m = setsByExercise('Kyykky 80 8\nkyykky 80 7');
    expect(m.get('kyykky')!.sets.map((s) => s.reps)).toEqual([8, 7]);
  });
});

describe('appendSet (Sarja -> Muistio)', () => {
  it('same weight appends just the reps', () => {
    expect(appendSet('Alataljasoutu 75 10', 'Alataljasoutu', 75, 9)).toBe('Alataljasoutu 75 10 9');
  });
  it('new weight appends "weight reps"; small integers get kg', () => {
    expect(appendSet('Alataljasoutu 75 10', 'Alataljasoutu', 77.5, 8)).toBe('Alataljasoutu 75 10 77,5 8');
    expect(appendSet('Vipunosto 8 10', 'Vipunosto', 10, 8)).toBe('Vipunosto 8 10 10kg 8');
  });
  it('new exercise starts a new line', () => {
    expect(appendSet('Kyykky 80 8\n', 'Pec deck', 65, 8)).toBe('Kyykky 80 8\nPec deck 65 8');
    expect(appendSet('', 'Pec deck', 65, 8)).toBe('Pec deck 65 8');
  });
  it('inserts before a comment', () => {
    expect(appendSet('Kyykky 80 8 # syvä', 'kyykky', 80, 7)).toBe('Kyykky 80 8 7 # syvä');
  });
  it('round-trips through the parser', () => {
    let t = '';
    for (const [kg, r] of [[27.5, 8], [25, 8], [25, 8]] as const) t = appendSet(t, 'Vinopenkki KP', kg, r);
    expect(t).toBe('Vinopenkki KP 27,5 8 25 8 8');
    expect(chips(t)).toEqual(['27.5×8', '25×8', '25×8']);
  });
});
