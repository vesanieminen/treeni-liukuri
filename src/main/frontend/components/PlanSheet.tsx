import { useState } from 'react';
import { useT } from 'Frontend/lib/i18n';
import { fmtTarget, parsePlan } from 'Frontend/lib/plan';
import { updateToday } from 'Frontend/lib/store';

/** "Liitä Valmentajan lista": paste the coach's 7:15 message, preview the parsed plan, use it today. */
export default function PlanSheet({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const { t, kg } = useT();
  const [text, setText] = useState('');
  const plan = parsePlan(text);
  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      onDone(t('plan.clipboardFailed'));
    }
  };
  return (
    <>
      <div className="dim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={t('plan.title')}>
        <div className="grab" />
        <div className="hd">
          <div>
            <h2>{t('plan.title')}</h2>
            <div className="setn">{t('plan.sub')}</div>
          </div>
          <button className="x" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <button className="btn s same" style={{ margin: '14px 0 8px' }} onClick={paste}>
          {t('plan.fromClipboard')}
        </button>
        <textarea
          className="paste"
          value={text}
          placeholder={t('plan.placeholder')}
          onChange={(e) => setText(e.target.value)}
        />
        {plan.items.length > 0 && (
          <div className="pv">
            <b>{plan.title || t('plan.workout')}</b> · {t('plan.count', { n: plan.items.length })}
            {plan.warnings.length ? ` · ⚠ ${plan.warnings.join(', ')}` : ''}
            <br />
            {plan.items.map((i) => `${i.name} ${i.kg !== null ? kg(i.kg) + ' kg ' : ''}${fmtTarget(i)}`).join(' · ')}
          </div>
        )}
        <button
          className="btn p go"
          disabled={!plan.items.length}
          style={{ opacity: plan.items.length ? 1 : 0.5 }}
          onClick={() => {
            updateToday((x) => ({ ...x, plan, title: plan.title || x.title }));
            onDone(t('plan.saved', { n: plan.items.length }));
          }}
        >
          {t('plan.use')}
        </button>
      </div>
    </>
  );
}
