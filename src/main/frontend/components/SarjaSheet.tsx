import { useState } from 'react';
import { shortDate, useT } from 'Frontend/lib/i18n';
import type { ItemStatus } from 'Frontend/lib/today';
import { logSet } from 'Frontend/lib/store';
import { STEP_KG } from 'Frontend/lib/rules';

/** 02-sarja: weight ±2,5, reps grid, last 3 sessions, "Kirjaa sarja · lepo alkaa". */
export default function SarjaSheet({ st, onClose }: { st: ItemStatus; onClose: () => void }) {
  const { item, done, last } = st;
  const { t, lang, kg: fk, day } = useT();
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
              {t('set.of', {
                n: done.length + 1,
                total: item.sets,
                target: item.repsMin === item.repsMax ? item.repsMax : `${item.repsMin}–${item.repsMax}`,
                rest: item.restSec,
              })}
            </div>
          </div>
          <button className="x" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <div className="lbl">{t('set.weight')}</div>
        <div className="card step">
          <button className="b" onClick={() => setKg((k) => Math.max(0, k - STEP_KG))}>
            {'−' + fk(2.5)}
          </button>
          <div className="v">
            {fk(kg)}
            <small>kg</small>
          </div>
          <button className="b" onClick={() => setKg((k) => k + STEP_KG)}>
            {'+' + fk(2.5)}
          </button>
        </div>
        <div className="lbl">{t('set.reps')}</div>
        <div className="rgrid">
          {grid.map((n) => (
            <button key={n} className={n === reps ? 'sel' : n === prevSet?.reps ? 'last' : ''} onClick={() => setReps(n)}>
              {n}
            </button>
          ))}
        </div>
        {last.length > 0 && (
          <>
            <div className="lbl">{t('set.history')}</div>
            <div className="hist">
              {last.map((l) => (
                <div className="card" key={l.session.id}>
                  <b>{l.sets.map((x) => x.reps).join(' · ')}</b>
                  <span>
                    {fk(Math.max(...l.sets.map((x) => x.kg)))} kg · {lang === 'fi' ? day(l.session.date).toLowerCase() : shortDate(l.session.date, lang)}
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
          {t('set.log')}
        </button>
        <div className="tip">{t('set.tip')}{item.note ? ` · ${item.note}` : ''}</div>
      </div>
    </>
  );
}
