import { useT } from 'Frontend/lib/i18n';
import { resetAll, useAppState } from 'Frontend/lib/store';

export default function DemoBanner() {
  const { demo } = useAppState();
  const { t } = useT();
  if (!demo) return null;
  return (
    <div className="demo">
      <span>{t('demo.banner')}</span>
      <button onClick={() => confirm(t('demo.clearConfirm')) && resetAll(false)}>{t('demo.clear')}</button>
    </div>
  );
}
