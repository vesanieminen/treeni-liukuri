import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import RestTimer from 'Frontend/components/RestTimer';
import SarjaSheet from 'Frontend/components/SarjaSheet';
import DemoBanner from 'Frontend/components/DemoBanner';
import { fiDayLabel } from 'Frontend/lib/export';
import { fmtKg } from 'Frontend/lib/num';
import { fmtTarget, type PlanItem } from 'Frontend/lib/plan';
import { itemStatuses, type ItemStatus } from 'Frontend/lib/today';
import { logSet, todaySession, useAppState } from 'Frontend/lib/store';

export const config: ViewConfig = { title: 'Tänään' };

function kgLabel(item: PlanItem) {
  if (item.kg === null) return '';
  return item.kgDrop !== null ? `${fmtKg(item.kg)} → ${fmtKg(item.kgDrop)} kg` : `${fmtKg(item.kg)} kg`;
}

function Dots({ st }: { st: ItemStatus }) {
  const n = Math.max(st.item.sets, st.done.length);
  return (
    <div className="dots">
      {Array.from({ length: n }, (_, i) => {
        const s = st.done[i];
        return (
          <div key={i} className={`d${s ? (s.reps >= st.item.repsMin ? ' ok' : ' lo') : ''}`}>
            {s?.reps ?? ''}
          </div>
        );
      })}
    </div>
  );
}

export default function TanaanView() {
  const s = useAppState();
  const nav = useNavigate();
  const sess = todaySession(s);
  const plan = sess.plan;
  const sts = itemStatuses(s);
  const [open, setOpen] = useState<string | null>(null);
  const activeIdx = sts.findIndex((x) => !x.complete);
  const doneCount = sts.filter((x) => x.complete).length;
  const setsLeft = sts.reduce((a, x) => a + Math.max(0, x.item.sets - x.done.length), 0);
  const minsLeft = Math.round((setsLeft * (40 + (sts[0]?.item.restSec ?? 90))) / 60);
  const openSt = sts.find((x) => x.item.name === open);

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">
            {fiDayLabel(sess.date)} · {sess.title}
            {plan?.when && plan.when.includes(':') ? ` · ${plan.when.split(' · ').pop()}` : ''}
          </div>
          <h1>Tänään</h1>
        </div>
        <RestTimer />
      </div>
      <DemoBanner />
      {sess.skipped && <div className="chips"><span className="chip a">Treeni siirretty – lepopäivä</span></div>}
      {!plan ? (
        <div className="card empty">
          Ei vielä päivän listaa.
          <br />
          Liitä Valmentajan viesti Muistiossa – tai kirjoita sarjat suoraan sinne.
          <button className="btn s same" style={{ marginTop: 12 }} onClick={() => nav('/muistio?liita=1')}>
            ⇣ Liitä Valmentajan lista
          </button>
        </div>
      ) : (
        <>
          <div className="chips">
            <span className="chip g">✓ Valmentajalta</span>
            {sess.readiness === 'vasynyt' && <span className="chip a">Väsynyt – kevennä</span>}
            {plan.warnings.map((w) => (
              <span key={w} className="chip a">
                {w}
              </span>
            ))}
          </div>
          <div className="prog">
            <i style={{ width: `${sts.length ? (doneCount / sts.length) * 100 : 0}%` }} />
          </div>
          <div className="pl">
            <span>
              {doneCount} / {sts.length} liikettä{plan.warmup ? ` · lämpö: ${plan.warmup.split(' ')[0]}` : ''}
            </span>
            <span>{setsLeft ? `~${minsLeft} min jäljellä` : 'Valmis 🎉'}</span>
          </div>
          <div className="list">
            {sts.map((st, i) => {
              const { item } = st;
              if (i === activeIdx) {
                const lastReps = st.last[0]?.sets.map((x) => x.reps).join(' · ');
                return (
                  <div key={item.name} className="card ex act">
                    <button className="row" style={{ textAlign: 'left' }} onClick={() => setOpen(item.name)}>
                      <div className="n">
                        <b style={{ fontSize: 17 }}>{item.name}</b>
                        <span>
                          {[kgLabel(item), fmtTarget(item), lastReps ? `viimeksi ${lastReps}` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <Dots st={st} />
                    </button>
                    {st.same && (
                      <button className="btn p same" onClick={() => logSet(item.name, st.same!.kg, st.same!.reps, item.restSec)}>
                        ↺ Sama kuin viimeksi · {fmtKg(st.same.kg)} × {st.same.reps}
                      </button>
                    )}
                    {item.kg !== null && (
                      <div className="hint">
                        Kun {item.sets}×{item.repsMax} menee → ensi kerralla {fmtKg(item.kg + 2.5)} kg
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button key={item.name} className={`card ex${st.complete ? ' done' : ''}`} onClick={() => setOpen(item.name)}>
                  <div className="n">
                    <b>{item.name}</b>
                    <span>
                      {[kgLabel(item), item.note || fmtTarget(item)].filter(Boolean).join(' · ')}
                      {st.complete && st.next.increased ? ' · ↑ ensi kerralla ' + fmtKg(st.next.kg!) : ''}
                    </span>
                  </div>
                  <Dots st={st} />
                </button>
              );
            })}
          </div>
        </>
      )}
      {openSt && <SarjaSheet st={openSt} onClose={() => setOpen(null)} />}
    </>
  );
}
