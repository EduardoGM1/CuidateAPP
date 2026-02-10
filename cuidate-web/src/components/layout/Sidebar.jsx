import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Button from '../ui/Button';

const navLinksBase = [
  { path: '/', label: 'Inicio' },
  { path: '/pacientes', label: 'Pacientes' },
  { path: '/citas', label: 'Citas' },
  { path: '/doctores', label: 'Doctores' },
  { path: '/reportes', label: 'Reportes' },
  { path: '/perfil', label: 'Perfil' },
];

const navLinksDoctor = [
  { path: '/notificaciones', label: 'Notificaciones' },
  { path: '/solicitudes-reprogramacion', label: 'Reprogramaciones' },
  { path: '/chat', label: 'Chat' },
];

const navLinksAdmin = [
  { path: '/admin/auditoria', label: 'Auditoría' },
  { path: '/admin/catalogos', label: 'Catálogos' },
  { path: '/admin/usuarios', label: 'Usuarios' },
];

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconMessageCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

const iconByPath = {
  '/': IconDashboard,
  '/pacientes': IconUsers,
  '/citas': IconCalendar,
  '/doctores': IconUser,
  '/reportes': IconFileText,
  '/perfil': IconUser,
  '/notificaciones': IconBell,
  '/solicitudes-reprogramacion': IconClipboard,
  '/chat': IconMessageCircle,
  '/admin/auditoria': IconShield,
  '/admin/catalogos': IconFileText,
  '/admin/usuarios': IconUsers,
};

function NavIcon({ path }) {
  const Icon = iconByPath[path] || IconFileText;
  return <Icon />;
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const getDisplayName = useAuthStore((s) => s.getDisplayName);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const logout = useAuthStore((s) => s.logout);

  const navLinks = [
    ...navLinksBase,
    ...(isAdmin() ? navLinksAdmin : []),
    ...(!isAdmin() ? navLinksDoctor : []),
  ];

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-brand" onClick={() => handleNav('/')} onKeyDown={(e) => e.key === 'Enter' && handleNav('/')} role="button" tabIndex={0}>
            <span className="sidebar-logo-text">Cuidate</span>
          </div>
          <nav className="sidebar-nav" aria-label="Navegación principal">
            {navLinks.map(({ path, label }) => {
              const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleNav(path)}
                  className={`sidebar-link ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="sidebar-link-icon"><NavIcon path={path} /></span>
                  <span className="sidebar-link-label">{label}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user" title={getDisplayName()}>
              <span className="sidebar-user-icon"><IconUser /></span>
              <span className="sidebar-user-name">{getDisplayName()}</span>
            </div>
            <Button variant="outline" className="sidebar-logout" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
