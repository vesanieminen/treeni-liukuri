import { useEffect, useRef, useState } from 'react';
import { stopRest, useAppState } from 'Frontend/lib/store';

/** Big rest timer (top right of Tänään). Survives reloads: the start time is stored. Tap to stop. */
export default function RestTimer() {
  const { rest } = useAppState();
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef<number | null>(null);
  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);
  if (!rest) {
    return (
      <div className="timer idle">
        <b>–:––</b>
        <span>LEPO</span>
      </div>
    );
  }
  const left = Math.ceil(rest.seconds - (now - rest.startedAt) / 1000);
  if (left <= 0 && buzzed.current !== rest.startedAt) {
    buzzed.current = rest.startedAt;
    navigator.vibrate?.([200, 100, 200]);
  }
  const abs = Math.abs(left);
  const txt = `${left < 0 ? '+' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
  return (
    <button className={`timer${left <= 0 ? ' over' : ''}`} onClick={stopRest} title="Lopeta lepo">
      <b>{txt}</b>
      <span>{left <= 0 ? 'VALMIS' : 'LEPO'}</span>
    </button>
  );
}
