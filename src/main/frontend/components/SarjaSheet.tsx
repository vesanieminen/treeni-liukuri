import { useState } from 'react';
import { fiDayLabel } from 'Frontend/lib/export';
import { fmtKg } from 'Frontend/lib/num';
import type { ItemStatus } from 'Frontend/lib/today';
import { logSet } from 'Frontend/lib/store';
import { STEP_KG } from 'Frontend/lib/rules';

/** 02-sarja: weight ±2,5, reps grid, last 3 sessions, "Kirjaa sarja · lepo alkaa". */
export default function SarjaSheet({ st, onClose }: { st: ItemStatus; onClose: () => void }) {
  const { item, done, last } = st;
  const prevSet = last[0]?.sets[done.length];
  const [kg, setKg] = useState<number>(done[done.length - 1]?.kg ?? prevSet?.kg ?? item.kg ?? 20);
  const [reps, setReps] = useState<number>(item.repsMax);
  const start = Math.max(1, Math.min(6, item.repsMin - 4));
  const grid = Array.from({ length: 10 }, (_, i) => start + i);
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={item.name}>
        <div className="grab" />
        <div className="hd">
          <div>
            <h2>{item.name}</h2>
            <div className="setn">
              Sarja {Math.min(done.length + 1, Math.max(item.sets, done.length + 1))} / {item.sets} · tavoite{' '}
              {item.repsMin === item.repsMax ? item.repsMax : `${item.repsMin}–${item.repsMax}`} · lepo {item.restSec} s
            </div>
          </div>
          <button className="x" onClick={onClose} aria-label="Sulje">
            ✕
          </button>
        </div>
        <div className="lbl">Paino</div>
        <div className="card step">
          <button className="b" onClick={() => setKg((k) => Math.max(0, k - STEP_KG))}>
            −2,5
          </button>
          <div className="v">
            {fmtKg(kg)}
            <small>kg</small>
          </div>
          <button className="b" onClick={() => setKg((k) => k + STEP_KG)}>
            +2,5
          </button>
        </div>
        <div className="lbl">Toistot</div>
        <div className="rgrid">
          {grid.map((n) => (
            <button key={n} className={n === reps ? 'sel' : n === prevSet?.reps ? 'last' : ''} onClick={() => setReps(n)}>
              {n}
            </button>
          ))}
        </div>
        {last.length > 0 && (
          <>
            <div className="lbl">Aiemmin</div>
            <div className="hist">
              {last.map((l) => (
                <div className="card" key={l.session.id}>
                  <b>{l.sets.map((x) => x.reps).join(' · ')}</b>
                  <span>
                    {fmtKg(Math.max(...l.sets.map((x) => x.kg)))} kg · {fiDayLabel(l.session.date).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <button
          className="btn p go"
          onClick={() => {
            logSet(item.name, kg, reps, item.restSec);
            onClose();
          }}
        >
          Kirjaa sarja · lepo alkaa
        </button>
        <div className="tip">Katkoviiva = viime kerta{item.note ? ` · ${item.note}` : ''}</div>
      </div>
    </>
  );
}
