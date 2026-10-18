import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import RestTimer from 'Frontend/components/RestTimer';
import SarjaSheet from 'Frontend/components/SarjaSheet';
import DemoBanner from 'Frontend/components/DemoBanner';
import { useT } from 'Frontend/lib/i18n';
import { fmtKg } from 'Frontend/lib/num';
import { fmtTarget, type PlanItem } from 'Frontend/lib/plan';
import { itemStatuses, type ItemStatus } from 'Frontend/lib/today';
import { logSet, todaySession, useAppState } from 'Frontend/lib/store';

export const config: ViewConfig = { title: 'Treeni Liukuri' };

function kgLabel(item: PlanItem, lang: 'fi' | 'en') {
  if (item.kg === null) return '';
  return item.kgDrop !== null ? `${fmtKg(item.kg, lang)} → ${fmtKg(item.kgDrop, lang)} kg` : `${fmtKg(item.kg, lang)} kg`;
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
  const { t, lang, kg, day } = useT();
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
            {day(sess.date)} · {sess.title}
            {plan?.when && plan.when.includes(':') ? ` · ${plan.when.split(' · ').pop()}` : ''}
          </div>
          <h1>{t('today.title')}</h1>
        </div>
        <RestTimer />
      </div>
      <DemoBanner />
      {sess.skipped && <div className="chips"><span className="chip a">{t('today.skipped')}</span></div>}
      {!plan ? (
        <div className="card empty">
          {t('today.noPlan1')}
          <br />
          {t('today.noPlan2')}
          <button className="btn s same" style={{ marginTop: 12 }} onClick={() => nav('/muistio?liita=1')}>
            {t('log.pastePlan')}
          </button>
        </div>
      ) : (
        <>
          <div className="chips">
            <span className="chip g">{t('today.fromCoach')}</span>
            {sess.readiness === 'vasynyt' && <span className="chip a">{t('today.tired')}</span>}
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
              {t('today.progress', { done: doneCount, total: sts.length })}
              {plan.warmup ? ` · ${t('today.warmup', { w: plan.warmup.split(' ')[0] })}` : ''}
            </span>
            <span>{setsLeft ? t('today.minsLeft', { n: minsLeft }) : t('today.allDone')}</span>
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
                          {[kgLabel(item, lang), fmtTarget(item), lastReps ? t('today.last', { r: lastReps }) : ''].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <Dots st={st} />
                    </button>
                    {st.same && (
                      <button className="btn p same" onClick={() => logSet(item.name, st.same!.kg, st.same!.reps, item.restSec)}>
                        {t('today.same', { kg: kg(st.same.kg), reps: st.same.reps })}
                      </button>
                    )}
                    {item.kg !== null && (
                      <div className="hint">
                        {t('today.hint', { sets: item.sets, reps: item.repsMax, kg: kg(item.kg + 2.5) })}
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
                      {[kgLabel(item, lang), item.note || fmtTarget(item)].filter(Boolean).join(' · ')}
                      {st.complete && st.next.increased ? t('today.nextUp', { kg: kg(st.next.kg!) }) : ''}
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
