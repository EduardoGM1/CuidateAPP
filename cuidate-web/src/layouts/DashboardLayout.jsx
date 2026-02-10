import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';

const navStyle = {
  background: 'var(--color-nav-primario)',
  color: 'var(--color-texto-en-primario)',
  padding: '0.75rem 1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: 'var(--shadow)',
};

const brandStyle = {
  fontWeight: 700,
  fontSize: '1.25rem',
  color: 'inherit',
  textDecoration: 'none',
};

const userStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const displayName =
    user?.nombre && user?.apellido_paterno
      ? `${user.nombre} ${user.apellido_paterno}`
      : user?.email ?? 'Usuario';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={navStyle}>
        <Link to="/" style={brandStyle}>
          Cuidate – Área profesional
        </Link>
        <div style={userStyle}>
          <span style={{ fontSize: '0.9rem' }}>{displayName}</span>
          <Button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: 'var(--color-texto-en-primario)',
              border: '1px solid rgba(255,255,255,0.8)',
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          padding: '1.5rem',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
