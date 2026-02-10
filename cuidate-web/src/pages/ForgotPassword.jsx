import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { Button, Input, Card } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email?.trim();
    if (!trimmed) {
      setError('El correo es obligatorio');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ email: trimmed });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al enviar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'var(--color-fondo)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--color-primario)', fontSize: '1.5rem' }}>
          Recuperar contraseña
        </h1>
        <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <p style={{ color: 'var(--color-primario)', marginBottom: '1rem' }}>
            Si el correo existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña. Revisa tu bandeja de entrada y spam.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p role="alert" style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-error)' }}>{error}</p>}
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </Button>
          </form>
        )}

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <Link to="/login" style={{ color: 'var(--color-primario)' }}>Volver al inicio de sesión</Link>
        </p>
      </Card>
    </div>
  );
}
