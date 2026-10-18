# Treeni Liukuri – scope

> Valmentajan ohjelma sisään, sarjat ulos — yksi näkymä salilla.

Training-only mobile PWA for Vesa (meals and weight are out of scope). Finnish UI.
Design: Visionary's mockups in `/workspace/valmennus-app/` (5 screens, 390×844).

## Stack decision

**Vaadin 25.3 with Hilla (React views) + Spring Boot 4, Java 21.**

- Gym use means bad or no signal. Vaadin **Flow** keeps UI state on the server, so every tap is a
  server round-trip; it can't log a set offline. **Hilla** views are client-side React, so with
  `@PWA` the service worker caches the app shell and the views run fully offline.
- All data is client-side first (localStorage, one JSON document). The Java side only serves the
  shell today. It is the natural place for later features (backup endpoint, Sheets sync behind
  Vesa's OK) as `@BrowserCallable` services, without changing the stack.
- It stays a standard Vaadin starter project (start.vaadin.com React preset), so Vesa's usual
  Vaadin tooling, `mvnw`, the production profile and Copilot all work as normal.
- The parser and the rules are plain TypeScript modules with no DOM. They run offline in the
  browser and are unit-tested with Vitest. A Java port is only needed if server-side import is
  ever wanted.

## Phases

### MVP (this pass) – done unless marked
- [x] Muistio parser (pure, unit-tested): decimal comma, mid-line weight change, ramp-up sets,
      `×` notation, comments/notes, ambiguity detection + one-tap fixes
- [x] **Muistio** screen: Notes-style lines, live chips, amber question rows with fix buttons,
      “Liitä Valmentajan lista” (paste plan) and “Lähetä Valmentajalle” (Web Share / clipboard)
- [x] **Tänään**: today's list from the pasted plan, target + last result, set dots, progress,
      warnings chips, active exercise with “Sama kuin viimeksi · kg × reps”, next-target hint,
      big rest timer (survives reloads, vibrates at 0)
- [x] **Sarja** bottom sheet: ±2,5 kg, reps grid (dashed = last time), last 3 sessions,
      “Kirjaa sarja · lepo alkaa”
- [x] Local storage (localStorage, `treeni-liukuri/v1`), demo data on first run (clear with one tap)
- [x] Export: coach text, CSV with the Treenipäiväkirja columns (today / all sessions)
- [x] PWA manifest + service worker (production build)
- [ ] Real-device offline test (install to the home screen on Vesa's phone, airplane mode)

### Phase 2
- [x] (early version) **Kehitys**: 5-week rhythm grid, lift trend sparklines, next target
- [x] (early version) **Ohjelma**: readiness Hyvä/Väsynyt/Skippaan, week plan, rules list
- [ ] Skip moves the session properly in storage (now it's only shown in the week view) + coach notification text
- [ ] “Väsynyt”: concrete effect on today's targets (e.g. −10 %, or drop the heavy lifts)
- [ ] Editable schedule/rotation, plan history (“Hypertrofiaohjelma 16.10.”), A/B week tracking
- [ ] IndexedDB + JSON backup/restore file (localStorage is fine for months of logs, but a backup matters)

### Later
- Voice logging (“soutu 75, kymmenen”) → speech-to-text → normalise number words → same parser
- Optional Google Sheet sync to Treenipäiväkirja – **only with Vesa's explicit OK**; the sheet
  belongs to Valmentaja. Until then CSV export only.
- Exercise aliases (“soutu” → Alataljasoutu), technique tips (ⓘ Tekniikkavinkit)

## Data model (client-side)

```ts
AppState  { version: 1, sessions: Session[], rest: RestTimer|null,
            schedule: { weekdays: number[] /*0=su*/, rotation: string[] /*Yläkroppa, Alakroppa*/ }, demo: boolean }
Session   { id, date: 'YYYY-MM-DD', title, abWeek?, text /* Muistio – source of truth */,
            plan: Plan|null, readiness?: 'hyva'|'vasynyt'|'skip', skipped?, movedFrom? }
Plan      { title, when, warmup, warnings: string[], items: PlanItem[] }
PlanItem  { name, kg, kgDrop /*17,5 → 15*/, sets, repsMin, repsMax, restSec, note }
RestTimer { startedAt /*epoch ms*/, seconds, exercise }
ParsedSet { kg, reps, warmup }        // derived from text, never stored
```

**The Muistio text is the single source of truth for a session.** Tänään/Sarja don't keep a
separate set list. They append to the text the way you would type it (`appendSet`: same weight →
just reps; new weight → `weight reps`; new exercise → new line). So the Muistio, the coach text
and the CSV can never disagree.

CSV columns (Treenipäiväkirja): `date;ab_week;workout_type;exercise;set;reps;kg;notes`, one row per
set, `;` separator, decimal comma, UTF-8 BOM. `notes` carries `lämmittely` and the line's comment.

## Parser grammar

```
text        := line ('\n' line)*
line        := bullet? name? item* comment?
bullet      := '-' | '•' | '*' | '–' | digits ('.'|')')            (ignored)
name        := word+                       up to the first number-ish token
               (no name → continues the previous line's exercise, e.g. "85 6 6")
item        := weight | reps | times | bodyweight | unitnote | word
weight      := NUM 'kg'? | '@' NUM | NUM ' kg'
               a plain NUM is a weight when: it's the first number; or it has a decimal (82,5 / 82.5);
               or it's an integer > MAX_REPS (20); or it has explicit kg / @
reps        := integer 1..20 after a weight
times       := A'x'B | A'×'B | A'x'B'x'C
               A×B = kg×reps when there's no weight yet or A looks like a weight, else sets×reps
               A×B×C = kg × sets × reps
bodyweight  := 'bw' | 'keho' | 'oma'      → weight 0
unitnote    := NUM ('km'|'m'|'min'|'s'|'sek'|'h'|'kcal'|'w')   → note (e.g. warm-up cardio)
comment     := '#' … | '//' …              → note
word        := anything else after the name → note ("syvä", "kevyt")
```

**Ambiguity rules**
- An integer > 20 that can be split into rep counts (`108` → 10 + 8, `888` → 8+8+8) *and* isn't a
  plausible new weight (outside 40–160 % of the current weight) is flagged: “108” = 10 + 8?
  with **Kyllä** (→ `10 8`) / **Ei, 108 kg** (→ `108kg`). Reps after it wait until it's resolved.
- A weight followed straight away by another weight → “Painolle X ei toistoja” (fix: remove).
- A weight at the end of the line with no reps is just pending (`35 × ?`). That's normal while typing.
- Ramp-up / warm-up chip (grey): a *single* set at ≤ 90 % of the line's top weight, before the
  first top-weight set. Two or more sets at a weight always count as work sets.

**Examples (all in `src/test/frontend/parser.test.ts`)**

| Input | Sets |
|---|---|
| `Kyykky 80 9 8 10` | 80×9, 80×8, 80×10 |
| `Vinopenkki KP 27,5 8 25 8 8` | 27,5×8, 25×8, 25×8 |
| `Ylätalja 60 10 70 8 8` | 60×10 (lämmittely), 70×8, 70×8 |
| `Vipunosto 8 10 8 8` | 8×10, 8×8, 8×8 |
| `Vipunosto 8 10 10kg 8 8` | 8×10 (lämmittely), 10×8, 10×8 |
| `Hauis scott 30 10 35 108` | 30×10, 35×? + “108” = 10 + 8? |
| `Kyykky 80 3x10` / `Kyykky 80×3×10` | 3 × (80×10) |
| `Kyykky 80x8 8` | 80×8, 80×8 |
| `Leuanveto bw 8 7 6` | bw×8, bw×7, bw×6 |
| `Kyykky 80 9 8 syvä # polvi ok` | 80×9, 80×8 · note “polvi ok syvä” |
| `Pyöräily 3,4 km` | note only |

Plan paste (`lib/plan.ts`) reads `Ma 19.10 Yläkroppa 8:30–9:30`, `Lämpö: …`, warning lines with no
numbers (`Ei litteää penkkiä`) and items like `4. Pystypunnerrus KP 17,5 → 15 kg 3×8–10 lepo 90 s`
or `Pec deck 65 kg – kevennä jos rinta kiristää`.

Rules (`lib/rules.ts`): `nextTarget` (all planned sets at the plan weight hit the top of the rep
range → +2,5 kg), `rescheduleSkip` (first later day that isn't next to another training day).

## Open design questions (for Visionary / Vesa)

1. **Coach message format**: what does the real 7:15 message look like? The plan parser is built
   from the mockup wording; a couple of real messages would let us harden it (and check the
   “17,5 → 15” meaning: drop weight, or “start at 17,5, drop to 15 if needed”?).
2. **Grey chip in Muistio (`60 × 10`)**: does it mean warm-up / ramp-up? It's built as “single
   lighter set before the top weight” and excluded from the rules and the dots. Should
   `Hauis scott 30 10 35 …` count 30×10 as a work set?
3. **Weight vs reps threshold**: reps above 20 must be written as `25r`? (not supported yet), and
   small weights mid-line need `10kg` or `@10`. OK, or do we need per-exercise memory?
4. **Skip behaviour**: “next free day, never two training days in a row” (built: Mon skipped →
   Sun), or roll the whole week (Mon → Wed, Wed → Fri …)? How should Valmentaja be told:
   share text, or something else?
5. **Väsynyt / “ei nostoja”**: which exercises count as “nostot” to drop: the main barbell
   lifts? Should the app change today's list automatically?
6. **A/B week**: how is it set: from the coach message, or alternating by ISO week?
7. **“Sama teksti menee … riveinä Treenipäiväkirjaan”** (mockup footer) implies Sheets sync. For
   now it's CSV only and the footer says so. Confirm sync stays a later, opt-in phase.
8. **Sarja reps grid** is 6–15 (it shifts down for low-rep targets). Is a “muu…” entry needed for
   1–5 or 16+?
9. **“Sano sarja” mic button** (01-tanaan) is left out of the MVP. OK to show it only once voice
   logging exists?
10. **Kehitys “+” marks** in the rhythm grid (vk 38 la “+”): PR day? Extra session?
11. **Multiple devices**: is one phone enough (local only), or is a backup/sync wanted soon?
