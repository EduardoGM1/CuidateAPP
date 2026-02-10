import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { Button, Input, Card } from '../components/ui';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    const t = (token || tokenFromUrl).trim();
    if (!t) {
      setError('Falta el token. Usa el enlace que recibiste por correo.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token: t, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al restablecer. El enlace pudo haber expirado.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-fondo)' }}>
        <Card style={{ width: '100%', maxWidth: '400px' }}>
          <p style={{ color: 'var(--color-primario)', marginBottom: '1rem' }}>Contraseña restablecida correctamente. Redirigiendo al inicio de sesión…</p>
          <Link to="/login">Ir al login</Link>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-fondo)' }}>
      <Card style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--color-primario)', fontSize: '1.5rem' }}>Nueva contraseña</h1>
        <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Ingresa tu nueva contraseña (mínimo 8 caracteres).
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {!tokenFromUrl && (
            <Input
              label="Token (pega el que recibiste por correo)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          )}
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p role="alert" style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-error)' }}>{error}</p>}
          <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Guardando…' : 'Restablecer contraseña'}
          </Button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <Link to="/login" style={{ color: 'var(--color-primario)' }}>Volver al inicio de sesión</Link>
        </p>
      </Card>
    </div>
  );
}
