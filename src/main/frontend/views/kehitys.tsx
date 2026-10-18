import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { MAIN_LIFTS } from 'Frontend/lib/demo';
import { shortDate, useT, weekHeader } from 'Frontend/lib/i18n';
import { isoWeek, liftTrends, mondayOf, sparkline } from 'Frontend/lib/progress';
import { addDays } from 'Frontend/lib/rules';
import { today, useAppState } from 'Frontend/lib/store';

export const config: ViewConfig = { title: 'Treeni Liukuri' };


export default function KehitysView() {
  const s = useAppState();
  const { t, lang, kg: fmtKg } = useT();
  const DAYS = weekHeader(lang);
  const today_ = today();
  const start = addDays(mondayOf(today_), -28);
  const inRange = s.sessions.filter((x) => x.date >= start && x.date <= today_);
  const trained = inRange.filter((x) => !x.skipped && x.text.trim());
  const restMoved = inRange.filter((x) => x.skipped || x.movedFrom).length;
  const trends = liftTrends(s.sessions, MAIN_LIFTS);
  const best = [...trends].sort((a, b) => b.delta - a.delta)[0];
  const byDate = new Map<string, (typeof inRange)[number][]>();
  inRange.forEach((x) => byDate.set(x.date, [...(byDate.get(x.date) ?? []), x]));

  return (
    <>
      <div className="eyebrow">
        {shortDate(start, lang)} – {shortDate(today_, lang)}
      </div>
      <h1>{t('progress.title')}</h1>
      <div className="stats">
        <div className="card">
          <b>{trained.length}</b>
          <span>{t('progress.workouts')}</span>
        </div>
        <div className="card">
          <b>{restMoved}</b>
          <span>{t('progress.restMoved')}</span>
        </div>
        <div className="card">
          <b>{best && best.delta > 0 ? `+${fmtKg(best.delta)}` : '–'}</b>
          <span>{best ? t('progress.kgIn', { name: best.name.toLowerCase() }) : 'kg'}</span>
        </div>
      </div>
      <div className="sec">{t('progress.rhythm')}</div>
      <div className="card kgrid">
        <div className="wk hd">
          <span></span>
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((w) => {
          const mon = addDays(start, w * 7);
          return (
            <div className="wk" key={w}>
              <span className="wl">{t('progress.week', { n: isoWeek(mon) })}</span>
              {DAYS.map((_, d) => {
                const date = addDays(mon, d);
                const xs = byDate.get(date) ?? [];
                const done = xs.find((x) => !x.skipped && x.text.trim());
                const cls = done ? (done.movedFrom ? 'm' : /^(ala|lower)/i.test(done.title) ? 'a' : 'y') : xs.some((x) => x.skipped) ? 's' : '';
                return (
                  <span key={d} className={`c ${cls}${date === today_ ? ' t' : ''}`} title={done ? `${date} ${done.title}` : date}>
                    {cls === 's' ? '–' : cls === 'm' ? '→' : ''}
                  </span>
                );
              })}
            </div>
          );
        })}
        <div className="leg">
          <span><i style={{ background: 'var(--acc)' }} />{t('progress.lower')}</span>
          <span><i style={{ background: '#7FAE9D' }} />{t('progress.upper')}</span>
          <span><i style={{ border: '1.5px dashed #D6B48A' }} />{t('progress.restSkip')}</span>
          <span><i style={{ background: 'var(--amber2)' }} />{t('progress.moved')}</span>
        </div>
      </div>
      <div className="sec">{t('progress.gains')}</div>
      {trends.length === 0 && <div className="card empty">{t('progress.empty')}</div>}
      <div className="lifts">
        {trends.map((tr) => {
          const vals = tr.points.map((p) => p.kg);
          const pts = sparkline(vals);
          const lastPt = pts.split(' ').pop()!.split(',');
          return (
            <div className="card lift" key={tr.name}>
              <div className="lt">
                <b>{tr.name}</b>
                {tr.note ? <span className="bd amb">{tr.note}</span> : <span className="bd">{tr.delta >= 0 ? '+' : ''}{fmtKg(tr.delta)}</span>}
                <div className="rg">
                  {fmtKg(vals[0])} → {fmtKg(vals[vals.length - 1])} kg
                </div>
                {tr.next?.kg != null && (
                  <div className="nx">
                    {t('progress.next', { kg: fmtKg(tr.next.kg), reps: tr.next.reps })}
                  </div>
                )}
              </div>
              <svg width="120" height="40" aria-hidden>
                <polyline points={pts} fill="none" stroke="#2E6B5B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="#2E6B5B" />
              </svg>
            </div>
          );
        })}
      </div>
    </>
  );
}
