import { NavLink, Outlet } from 'react-router';
import { useOnline } from '../data';
import { IconCards, IconChart, IconMore, IconPlan, IconToday } from '../components/Icons';

const NAV = [
  { to: '/', label: 'Hoy', icon: <IconToday />, end: true },
  { to: '/repaso', label: 'Repaso', icon: <IconCards />, end: false },
  { to: '/plan', label: 'Plan', icon: <IconPlan />, end: false },
  { to: '/progreso', label: 'Progreso', icon: <IconChart />, end: false },
  { to: '/mas', label: 'Más', icon: <IconMore />, end: false },
];

export function Layout() {
  const online = useOnline();
  return (
    <>
      <div className="app">
        <header className="topbar">
          <span className="title">Inglés 30 días</span>
          {!online && <span className="offline-pill" role="status">Sin conexión · tus datos se guardan igual</span>}
        </header>
        <main>
          <Outlet />
        </main>
      </div>
      <nav className="bottomnav" aria-label="Navegación principal">
        <ul>
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.icon}
                <span>{n.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
