import '../app.css';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useT, type MsgKey } from 'Frontend/lib/i18n';

const TABS: { to: string; label: MsgKey; ic: string }[] = [
  { to: '/', label: 'tab.today', ic: 'circ' },
  { to: '/muistio', label: 'tab.log', ic: 'lines' },
  { to: '/kehitys', label: 'tab.progress', ic: 'bar' },
  { to: '/ohjelma', label: 'tab.program', ic: '' },
];

export default function MainLayout() {
  const { t } = useT();
  return (
    <div className="app">
      <main className="scroll">
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
      <nav className="tabbar">
        {TABS.map((x) => (
          <NavLink key={x.to} to={x.to} end className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <div className={`ic ${x.ic}`}></div>
            {t(x.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
