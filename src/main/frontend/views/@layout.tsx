import '../app.css';
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';

const TABS = [
  { to: '/', label: 'Tänään', ic: 'circ' },
  { to: '/muistio', label: 'Muistio', ic: 'lines' },
  { to: '/kehitys', label: 'Kehitys', ic: 'bar' },
  { to: '/ohjelma', label: 'Ohjelma', ic: '' },
];

export default function MainLayout() {
  return (
    <div className="app">
      <main className="scroll">
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <div className={`ic ${t.ic}`}></div>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
