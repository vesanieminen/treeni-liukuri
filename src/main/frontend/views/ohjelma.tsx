import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import DemoBanner from 'Frontend/components/DemoBanner';
import { fmtKg } from 'Frontend/lib/num';
import { addDays, rescheduleSkip } from 'Frontend/lib/rules';
import { resetAll, setState, today, todaySession, updateToday, useAppState, type Readiness } from 'Frontend/lib/store';

export const config: ViewConfig = { title: 'Ohjelma' };

const WD = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
const wd = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { name: WD[new Date(y, m - 1, d).getDay()], day: d, dow: new Date(y, m - 1, d).getDay() };
};

export default function OhjelmaView() {
  const s = useAppState();
  const t = today();
  const sess = todaySession(s);
  const plan = sess.plan;

  // Planned training days for the next 7 days (+ today), with the A/B rotation continuing.
  const planned: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(t, i);
    if (s.schedule.weekdays.includes(wd(d).dow) || (i === 0 && (sess.plan || sess.text))) planned.push(d);
  }
  const days = sess.skipped && planned.includes(t) ? rescheduleSkip(planned, t) : planned;
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
  const weekdays = s.schedule.weekdays.map((d) => WD[d]).join(' / ');

  return (
    <>
      <div className="eyebrow">Hypertrofia · {weekdays}</div>
      <h1>Ohjelma</h1>
      <DemoBanner />
      <div className="card ready">
        <h3>Miltä tuntuu tänään?</h3>
        <div className="rb">
          {(
            [
              ['hyva', 'Hyvä', 'mennään'],
              ['vasynyt', 'Väsynyt', 'ei nostoja'],
              ['skip', 'Skippaan', 'siirrä'],
            ] as const
          ).map(([k, l, sub]) => (
            <button key={k} className={(sess.readiness ?? 'hyva') === k ? 'on' : ''} onClick={() => setReady(k)}>
              {l}
              <small>{sub}</small>
            </button>
          ))}
        </div>
        <div className="rnote">
          Skippaus siirtää treenin seuraavaan vapaaseen päivään — ei kahta kovaa päivää putkeen. Kerro Valmentajalle
          Muistion “Lähetä”-napilla.
        </div>
      </div>
      <div className="sec">Tämä viikko</div>
      <div className="card days">
        {rows.map((r, i) => {
          const w = wd(r.date);
          const p = s.sessions.find((x) => x.date === r.date)?.plan;
          const first = p?.items[0];
          return (
            <div className={`day${i === 0 ? ' nx' : ''}`} key={r.date}>
              <div className="dn">
                {w.name}
                <b>{w.day}</b>
              </div>
              <div className="di">
                <b>{r.title}</b>
                <span>
                  {p ? `${p.items.length} liikettä${first?.kg != null ? ` · ${first.name.toLowerCase()} ${fmtKg(first.kg)}` : ''}` : 'vuorottelu jatkuu'}
                </span>
              </div>
              {r.moved ? <span className="tag m">Siirretty</span> : i === 0 ? <span className="tag">{r.date === t ? 'Tänään' : 'Seuraava'}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="sec">Säännöt</div>
      <div className="card rules">
        {(plan?.warnings ?? []).map((w) => (
          <div className="rule w" key={w}>
            <i>!</i>
            <div>{w}</div>
          </div>
        ))}
        <div className="rule">
          <i>↑</i>
          <div>Kaikki sarjat tavoitteeseen → +2,5 kg seuraavalla kerralla.</div>
        </div>
        <div className="rule">
          <i>~</i>
          <div>Lämpö: {plan?.warmup || 'pyöräily 3,4 km oletuksena, muuten 5–8 min kuntopyörä'}.</div>
        </div>
      </div>
      <div className="src">Päivittyy Valmentajan listasta (Muistio → Liitä)</div>
      <div className="danger">
        <button onClick={() => confirm('Ladataanko demodata? Nykyiset merkinnät korvataan.') && resetAll(true)}>Lataa demo</button>
        <button onClick={() => confirm('Poistetaanko kaikki merkinnät tästä selaimesta?') && resetAll(false)}>Tyhjennä kaikki</button>
      </div>
    </>
  );
}
