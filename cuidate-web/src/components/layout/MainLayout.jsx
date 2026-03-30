import { useState, useEffect, Fragment } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Drawer, Button } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { connect } from '../../api/socket';
import { STORAGE_KEYS } from '../../utils/constants';
import ButtonUI from '../ui/Button';
import Logo from '../common/Logo';
import OnboardingHost from '../../onboarding/OnboardingHost';

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconFileText() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
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

const PATH_TITLES = {
  '/': 'Inicio',
  '/pacientes': 'Pacientes',
  '/pacientes/nuevo': 'Nuevo paciente',
  '/citas': 'Citas',
  '/doctores': 'Doctores',
  '/reportes': 'Reportes',
  '/perfil': 'Perfil',
  '/notificaciones': 'Notificaciones',
  '/solicitudes-reprogramacion': 'Reprogramaciones',
  '/chat': 'Chat',
  '/admin/auditoria': 'Auditoría',
  '/admin/catalogos': 'Catálogos',
  '/admin/usuarios': 'Usuarios',
};

function getPageTitle(pathname) {
  if (pathname === '/' || pathname === '/dashboard') return 'Inicio';
  for (const [path, title] of Object.entries(PATH_TITLES)) {
    if (path !== '/' && pathname.startsWith(path)) {
      if (pathname === path) return title;
      if (pathname.match(new RegExp(`^${path.replace(/\/$/, '')}/[^/]+$`))) return title;
      return title;
    }
  }
  if (pathname.startsWith('/pacientes/')) return 'Detalle de paciente';
  if (pathname.startsWith('/citas/')) return 'Detalle de cita';
  if (pathname.startsWith('/doctores/')) return pathname.includes('/editar') ? 'Editar doctor' : pathname.endsWith('/nuevo') ? 'Nuevo doctor' : 'Detalle de doctor';
  if (pathname.startsWith('/admin/auditoria/')) return 'Detalle de auditoría';
  if (pathname.startsWith('/chat/')) return 'Conversación';
  return 'Cuidate';
}

const navLinksBase = [
  { path: '/', label: 'Inicio', icon: iconByPath['/'] },
  { path: '/pacientes', label: 'Pacientes', icon: iconByPath['/pacientes'] },
  { path: '/citas', label: 'Citas', icon: iconByPath['/citas'] },
  { path: '/perfil', label: 'Perfil', icon: iconByPath['/perfil'] },
];

const navLinkDoctores = { path: '/doctores', label: 'Doctores', icon: iconByPath['/doctores'] };
const navLinkReportes = { path: '/reportes', label: 'Reportes', icon: iconByPath['/reportes'] };

const navLinksDoctor = [
  { path: '/notificaciones', label: 'Notificaciones', icon: iconByPath['/notificaciones'] },
  { path: '/solicitudes-reprogramacion', label: 'Reprogramaciones', icon: iconByPath['/solicitudes-reprogramacion'] },
  { path: '/chat', label: 'Chat', icon: iconByPath['/chat'] },
];

const navLinksAdmin = [
  { path: '/admin/auditoria', label: 'Auditoría', icon: iconByPath['/admin/auditoria'] },
  { path: '/admin/catalogos', label: 'Catálogos', icon: iconByPath['/admin/catalogos'] },
  { path: '/admin/usuarios', label: 'Usuarios', icon: iconByPath['/admin/usuarios'] },
];

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 992);
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);
  const token = useAuthStore((s) => s.token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null));
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const getDisplayName = useAuthStore((s) => s.getDisplayName);
  const logout = useAuthStore((s) => s.logout);

  // Conexión WebSocket para tiempo real (chat, notificaciones, citas, pacientes, etc.)
  useEffect(() => {
    if (token && typeof connect === 'function') connect(token);
  }, [token]);

  const isAdminFn = typeof isAdmin === 'function' ? isAdmin : () => false;
  const getDisplayNameSafe = typeof getDisplayName === 'function' ? getDisplayName : () => '';

  const navLinks = [
    ...navLinksBase,
    ...(isAdminFn() ? [navLinkDoctores] : []),
    navLinkReportes,
    ...(isAdminFn() ? navLinksAdmin : []),
    ...(!isAdminFn() ? navLinksDoctor : []),
  ];

  const menuItems = navLinks.map(({ path, label, icon: Icon }) => ({
    key: path,
    label,
    icon: typeof Icon === 'function' ? <Icon /> : null,
    onClick: () => {
      navigate(path);
      setDrawerOpen(false);
    },
  }));

  const selectedKey = navLinks.find(({ path }) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.key ?? '/';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Fragment>
    <Layout style={{ minHeight: '100vh', background: 'var(--saas-bg, var(--color-fondo))' }}>
      {/* Sider: visible solo en desktop (oculto en móvil con CSS) */}
      <Layout.Sider
        data-tour="onboarding-sidebar"
        breakpoint="lg"
        collapsedWidth="0"
        width={280}
        onBreakpoint={(broken) => setMobile(broken)}
        style={{
          background: 'var(--color-fondo-card)',
          borderRight: '1px solid var(--color-borde-claro)',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
        className="main-layout-sider"
      >
        <div
          style={{ padding: '1.25rem 1.25rem 2rem', cursor: 'pointer' }}
          onClick={() => { navigate('/'); setDrawerOpen(false); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
        >
          <Logo variant="inline" size="small" />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{
            borderRight: 'none',
            padding: '0 0.75rem',
            background: 'transparent',
          }}
        />
        <div data-tour="onboarding-user-area" style={{ padding: '1rem 1rem 0', borderTop: '1px solid var(--color-borde-claro)', marginTop: '1rem' }}>
          <div style={{ padding: '0.75rem', marginBottom: '0.75rem', background: 'var(--color-fondo-secundario)', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500 }}>
            {getDisplayNameSafe()}
          </div>
          <ButtonUI variant="outline" className="sidebar-logout" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Cerrar sesión
          </ButtonUI>
        </div>
      </Layout.Sider>

      {/* En móvil: drawer con el mismo menú */}
      <Drawer
        title={<Logo variant="inline" size="small" />}
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        bodyStyle={{ padding: 0 }}
        styles={{ header: { background: 'var(--color-fondo-card)' } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderRight: 'none', padding: '0.5rem' }}
        />
        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-borde-claro)' }}>
          <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>{getDisplayNameSafe()}</div>
          <ButtonUI variant="outline" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Cerrar sesión
          </ButtonUI>
        </div>
      </Drawer>

      <Layout style={{ marginLeft: mobile ? 0 : 280, minHeight: '100vh', maxWidth: '100%', overflow: 'hidden' }}>
        <Layout.Header
          style={{
            height: 64,
            padding: '0 1rem',
            background: 'var(--color-fondo-card)',
            borderBottom: '1px solid var(--color-borde-claro)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
            minWidth: 0,
            flex: '0 0 auto',
          }}
        >
          <Button
            type="text"
            aria-label="Abrir menú"
            data-tour="onboarding-menu-toggle"
            onClick={() => setDrawerOpen(true)}
            className="saas-menu-toggle"
            style={{
              display: mobile ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MenuIcon />
          </Button>
          <h1
            data-tour="onboarding-header-title"
            style={{
              margin: 0,
              fontSize: 'clamp(1rem, 4vw, 1.25rem)',
              fontWeight: 600,
              color: 'var(--color-texto-primario)',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pageTitle}
          </h1>
        </Layout.Header>
        <Layout.Content
          data-tour="onboarding-main-content"
          style={{
            padding: 'clamp(1rem, 4vw, 2rem)',
            overflow: 'auto',
            minHeight: 'calc(100vh - 64px)',
            background: 'var(--color-fondo)',
            color: 'var(--color-texto-primario)',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
    <OnboardingHost isMobile={mobile} />
    </Fragment>
  );
}
