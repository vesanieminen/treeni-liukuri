import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import DemoBanner from 'Frontend/components/DemoBanner';
import { LANGS, useT, weekdayName, type Lang, type MsgKey } from 'Frontend/lib/i18n';
import { addDays, rescheduleSkip } from 'Frontend/lib/rules';
import { changeLanguage, resetAll, setState, today, todaySession, updateToday, useAppState, type Readiness } from 'Frontend/lib/store';

export const config: ViewConfig = { title: 'Treeni Liukuri' };

const LANG_NAMES: Record<Lang, string> = { fi: 'Suomi', en: 'English' };
const dowOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { dow: new Date(y, m - 1, d).getDay(), day: d };
};
const READY: [Readiness, MsgKey, MsgKey][] = [
  ['hyva', 'program.good', 'program.goodSub'],
  ['vasynyt', 'program.tired', 'program.tiredSub'],
  ['skip', 'program.skip', 'program.skipSub'],
];

export default function OhjelmaView() {
  const s = useAppState();
  const { t, lang, kg } = useT();
  const t0 = today();
  const sess = todaySession(s);
  const plan = sess.plan;

  // Planned training days for the next 7 days (+ today), with the A/B rotation continuing.
  const planned: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(t0, i);
    if (s.schedule.weekdays.includes(dowOf(d).dow) || (i === 0 && (sess.plan || sess.text))) planned.push(d);
  }
  const days = sess.skipped && planned.includes(t0) ? rescheduleSkip(planned, t0) : planned;
  const rot = s.schedule.rotation;
  const after = (x: string) => rot[(rot.indexOf(x) + 1) % rot.length] ?? x;
  let cur = sess.skipped ? after(sess.title) : sess.title;
  const rows = days.map((d) => {
    if (sess.skipped && !planned.includes(d)) return { date: d, title: sess.title, moved: true };
    const existing = s.sessions.find((x) => x.date === d && !x.skipped);
    const title = existing?.title ?? cur;
    cur = after(title);
    return { date: d, title, moved: false };
  });

  const setReady = (r: Readiness) => {
    updateToday((x) => ({ ...x, readiness: r, skipped: r === 'skip' }));
    if (r === 'skip') setState((st) => ({ ...st, rest: null }));
  };
  const weekdays = s.schedule.weekdays.map((d) => weekdayName(d, lang)).join(' / ');

  return (
    <>
      <div className="eyebrow">{t('program.eyebrow', { days: weekdays })}</div>
      <h1>{t('program.title')}</h1>
      <DemoBanner />
      <div className="card ready">
        <h3>{t('program.ready')}</h3>
        <div className="rb">
          {READY.map(([k, l, sub]) => (
            <button key={k} className={(sess.readiness ?? 'hyva') === k ? 'on' : ''} onClick={() => setReady(k)}>
              {t(l)}
              <small>{t(sub)}</small>
            </button>
          ))}
        </div>
        <div className="rnote">{t('program.skipNote')}</div>
      </div>
      <div className="sec">{t('program.thisWeek')}</div>
      <div className="card days">
        {rows.map((r, i) => {
          const w = dowOf(r.date);
          const p = s.sessions.find((x) => x.date === r.date)?.plan;
          const first = p?.items[0];
          return (
            <div className={`day${i === 0 ? ' nx' : ''}`} key={r.date}>
              <div className="dn">
                {weekdayName(w.dow, lang)}
                <b>{w.day}</b>
              </div>
              <div className="di">
                <b>{r.title}</b>
                <span>
                  {p
                    ? `${t('program.exercises', { n: p.items.length })}${first?.kg != null ? ` · ${first.name.toLowerCase()} ${kg(first.kg)}` : ''}`
                    : t('program.rotation')}
                </span>
              </div>
              {r.moved ? (
                <span className="tag m">{t('program.moved')}</span>
              ) : i === 0 ? (
                <span className="tag">{r.date === t0 ? t('program.today') : t('program.next')}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="sec">{t('program.rules')}</div>
      <div className="card rules">
        {(plan?.warnings ?? []).map((w) => (
          <div className="rule w" key={w}>
            <i>!</i>
            <div>{w}</div>
          </div>
        ))}
        <div className="rule">
          <i>↑</i>
          <div>{t('program.ruleUp')}</div>
        </div>
        <div className="rule">
          <i>~</i>
          <div>{t('program.ruleWarmup', { w: plan?.warmup || t('program.defaultWarmup') })}</div>
        </div>
      </div>
      <div className="src">{t('program.source')}</div>
      <div className="sec">{t('program.language')}</div>
      <div className="seg" role="radiogroup" aria-label={t('program.language')}>
        {LANGS.map((l) => (
          <button key={l} role="radio" aria-checked={l === lang} className={l === lang ? 'on' : ''} onClick={() => changeLanguage(l)}>
            {LANG_NAMES[l]}
          </button>
        ))}
      </div>
      <div className="danger">
        <button onClick={() => confirm(t('program.loadDemoConfirm')) && resetAll(true)}>{t('program.loadDemo')}</button>
        <button onClick={() => confirm(t('program.clearAllConfirm')) && resetAll(false)}>{t('program.clearAll')}</button>
      </div>
    </>
  );
}
