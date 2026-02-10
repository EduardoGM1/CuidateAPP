import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Button from '../ui/Button';

const navLinksBase = [
  { path: '/', label: 'Dashboard' },
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

export default function Header() {
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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        <span
          className="header-brand"
          onClick={() => navigate('/')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          role="button"
          tabIndex={0}
        >
          Cuidate
        </span>
        <nav>
          {navLinks.map(({ path, label }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={`nav-link-btn ${isActive ? 'is-active' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="header-actions">
        <span className="header-user">{getDisplayName()}</span>
        <Button variant="outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.8)' }} onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
