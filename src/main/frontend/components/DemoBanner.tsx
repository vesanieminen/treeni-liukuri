import { resetAll, useAppState } from 'Frontend/lib/store';

export default function DemoBanner() {
  const { demo } = useAppState();
  if (!demo) return null;
  return (
    <div className="demo">
      <span>Esimerkkidataa (demo) – kaikki tallentuu vain tähän selaimeen.</span>
      <button onClick={() => confirm('Poistetaanko demodata? Aloitat tyhjästä.') && resetAll(false)}>Tyhjennä</button>
    </div>
  );
}
