import { useState } from 'react';
import { fmtKg } from 'Frontend/lib/num';
import { fmtTarget, parsePlan } from 'Frontend/lib/plan';
import { updateToday } from 'Frontend/lib/store';

/** "Liitä Valmentajan lista": paste the coach's 7:15 message, preview the parsed plan, use it today. */
export default function PlanSheet({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [text, setText] = useState('');
  const plan = parsePlan(text);
  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      onDone('Leikepöytää ei voitu lukea – liitä tekstikenttään');
    }
  };
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Liitä Valmentajan lista">
        <div className="grab" />
        <div className="hd">
          <div>
            <h2>Valmentajan lista</h2>
            <div className="setn">Liitä aamun viesti – siitä tulee Tänään-lista</div>
          </div>
          <button className="x" onClick={onClose} aria-label="Sulje">
            ✕
          </button>
        </div>
        <button className="btn s same" style={{ margin: '14px 0 8px' }} onClick={paste}>
          ⇣ Liitä leikepöydältä
        </button>
        <textarea
          className="paste"
          value={text}
          placeholder={'Yläkroppa 8:30–9:30\nEi litteää penkkiä\n1. Vinopenkki KP 27,5 kg 3x8\n2. Ylätalja 70 kg 3x10'}
          onChange={(e) => setText(e.target.value)}
        />
        {plan.items.length > 0 && (
          <div className="pv">
            <b>{plan.title || 'Treeni'}</b> · {plan.items.length} liikettä
            {plan.warnings.length ? ` · ⚠ ${plan.warnings.join(', ')}` : ''}
            <br />
            {plan.items.map((i) => `${i.name} ${i.kg !== null ? fmtKg(i.kg) + ' kg ' : ''}${fmtTarget(i)}`).join(' · ')}
          </div>
        )}
        <button
          className="btn p go"
          disabled={!plan.items.length}
          style={{ opacity: plan.items.length ? 1 : 0.5 }}
          onClick={() => {
            updateToday((x) => ({ ...x, plan, title: plan.title || x.title }));
            onDone(`Lista tallennettu: ${plan.items.length} liikettä`);
          }}
        >
          Käytä tänään
        </button>
      </div>
    </>
  );
}
