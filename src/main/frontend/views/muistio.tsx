import { ViewConfig } from '@vaadin/hilla-file-router/types.js';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import PlanSheet from 'Frontend/components/PlanSheet';
import { toCoachText, toCsv } from 'Frontend/lib/export';
import { useT, type MsgKey } from 'Frontend/lib/i18n';
import { applyFix, parseText } from 'Frontend/lib/parser';
import { getState, todaySession, updateToday, useAppState } from 'Frontend/lib/store';

export const config: ViewConfig = { title: 'Treeni Liukuri' };

const FIX_KEY: Record<string, MsgKey> = { split: 'issue.split', asWeight: 'issue.asWeight', remove: 'issue.remove' };

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MuistioView() {
  const s = useAppState();
  const { t, lang, kg, day } = useT();
  const sess = todaySession(s);
  const stored = sess.text.length ? sess.text.split('\n') : [''];
  // Always keep an empty line at the end to type into, like Notes.
  const lines = stored[stored.length - 1].trim() ? [...stored, ''] : stored;
  const parsed = parseText(lines.join('\n'));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focusNext = useRef<{ i: number; pos: number } | null>(null);
  const [params, setParams] = useSearchParams();
  const [planOpen, setPlanOpen] = useState(params.get('liita') === '1');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (focusNext.current) {
      const { i, pos } = focusNext.current;
      focusNext.current = null;
      const el = refs.current[i];
      el?.focus();
      el?.setSelectionRange(pos, pos);
    }
  });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const setLines = (next: string[]) => updateToday((x) => ({ ...x, text: next.join('\n').replace(/\n+$/, '') }));

  const send = async () => {
    const text = toCoachText(sess, lang);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast(t('log.copied'));
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setToast(t('log.copyFailed'));
    }
  };

  return (
    <>
      <div className="eyebrow">
        {day(sess.date)} · {sess.title}
      </div>
      <h1>{t('log.title')}</h1>
      <div className="sub">
        {t('log.sub1')} <span className="mono" style={{ color: 'var(--ink)' }}>{t('log.subMono')}</span> {t('log.sub2')}
      </div>
      <div className="card pad">
        {lines.map((line, i) => {
          const p = parsed[i];
          const flag = p.issues.length > 0;
          return (
            <div key={i} className={`ln${flag ? ' flag' : ''}${p.kind === 'header' ? ' hdr' : ''}`}>
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={line}
                inputMode="text"
                autoCapitalize="sentences"
                spellCheck={false}
                placeholder={i === lines.length - 1 ? (i === 0 ? t('log.placeholder') : t('log.newLine')) : ''}
                aria-label={t('log.line', { n: i + 1 })}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = e.target.value;
                  setLines(next);
                }}
                onPaste={(e) => {
                  const t = e.clipboardData.getData('text');
                  if (!t.includes('\n')) return;
                  e.preventDefault();
                  const el = e.currentTarget;
                  const before = line.slice(0, el.selectionStart ?? line.length);
                  const after = line.slice(el.selectionEnd ?? line.length);
                  const ins = (before + t + after).split(/\r?\n/);
                  const next = [...lines.slice(0, i), ...ins, ...lines.slice(i + 1)];
                  focusNext.current = { i: i + ins.length - 1, pos: ins[ins.length - 1].length - after.length };
                  setLines(next);
                }}
                onKeyDown={(e) => {
                  const el = e.currentTarget;
                  const pos = el.selectionStart ?? 0;
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const next = [...lines.slice(0, i), line.slice(0, pos), line.slice(pos), ...lines.slice(i + 1)];
                    focusNext.current = { i: i + 1, pos: 0 };
                    setLines(next);
                  } else if (e.key === 'Backspace' && pos === 0 && el.selectionEnd === 0 && i > 0) {
                    e.preventDefault();
                    const prev = lines[i - 1];
                    const next = [...lines.slice(0, i - 1), prev + line, ...lines.slice(i + 1)];
                    focusNext.current = { i: i - 1, pos: prev.length };
                    setLines(next);
                  } else if (e.key === 'ArrowDown' && i < lines.length - 1) {
                    focusNext.current = { i: i + 1, pos };
                    setLines(lines);
                  } else if (e.key === 'ArrowUp' && i > 0) {
                    focusNext.current = { i: i - 1, pos };
                    setLines(lines);
                  }
                }}
              />
              {p.kind === 'exercise' && (p.sets.length > 0 || p.pendingKg !== null || p.note) && (
                <div className="par">
                  {p.continuation && p.exercise && <span className="note">↳ {p.exercise}</span>}
                  {p.sets.map((x, j) => (
                    <span key={j} className={x.warmup ? 'w' : ''} title={x.warmup ? t('log.warmupTitle') : undefined}>
                      {x.kg === 0 ? 'bw' : kg(x.kg)} × {x.reps}
                    </span>
                  ))}
                  {p.pendingKg !== null && <span className="p">{kg(p.pendingKg)} × ?</span>}
                  {p.note && <span className="note">{p.note}</span>}
                </div>
              )}
              {p.issues.map((iss, j) => (
                <div className="q" key={j}>
                  {iss.kind === 'missing-reps' && iss.kg !== undefined ? t('issue.missingReps', { kg: kg(iss.kg) }) : iss.message}
                  {iss.fixes.map((f, k) => (
                    <button
                      key={f.id}
                      className={k ? 'alt' : ''}
                      onClick={() => {
                        const next = [...lines];
                        next[i] = applyFix(line, iss, f);
                        setLines(next);
                      }}
                    >
                      {FIX_KEY[f.id] ? t(FIX_KEY[f.id], { raw: iss.raw }) : f.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="acts">
        <button className="btn s" onClick={() => setPlanOpen(true)}>
          {t('log.pastePlan')}
        </button>
        <button className="btn p" onClick={send}>
          {t('log.send')}
        </button>
      </div>
      <div className="foot">
        {t('log.foot')} ·{' '}
        <button onClick={() => download(`treeni-${sess.date}.csv`, toCsv([sess], { lang }), 'text/csv')}>{t('log.csvToday')}</button> ·{' '}
        <button
          onClick={() =>
            download(
              lang === 'fi' ? 'treenipaivakirja.csv' : 'training-log.csv',
              toCsv(getState().sessions.filter((x) => !x.skipped && x.text), { lang }),
              'text/csv',
            )
          }
        >
          {t('log.csvAll')}
        </button>
      </div>
      {planOpen && (
        <PlanSheet
          onClose={() => {
            setPlanOpen(false);
            if (params.has('liita')) setParams({});
          }}
          onDone={(m) => {
            setToast(m);
            setPlanOpen(false);
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
