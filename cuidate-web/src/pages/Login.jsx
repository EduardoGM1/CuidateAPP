import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../lib/validations/loginSchema';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Card } from '../components/ui';
import Logo from '../components/common/Logo';
import { LOGIN_REASON_SESSION_EXPIRED } from '../utils/constants';
import { PrivacyNoticeInlineLink } from '../components/legal/PrivacyNoticeContent';

const SESSION_EXPIRED_MESSAGE = 'Tu sesión ha caducado, inicia sesión nuevamente.';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [submitError, setSubmitError] = useState('');
  const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState(false);
  const reason = searchParams.get('reason');

  useEffect(() => {
    if (reason === LOGIN_REASON_SESSION_EXPIRED) {
      setShowSessionExpiredMessage(true);
      setSearchParams({}, { replace: true });
    }
  }, [reason, setSearchParams]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = location.state?.from?.pathname || '/';

  async function onSubmit(data) {
    setSubmitError('');
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Error al iniciar sesión. Revisa tu correo y contraseña.';
      setSubmitError(message);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <h1 style={{ margin: 0, display: 'flex', justifyContent: 'center' }}>
          <Logo size="large" variant="stack" />
        </h1>
        <p className="login-subtitle">Área de Doctores y Administradores</p>

        {showSessionExpiredMessage && (
          <p role="status" className="login-session-expired" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-warning-bg, #fffbe6)', border: '1px solid var(--color-warning, #faad14)', borderRadius: '6px', color: 'var(--color-texto-primario)', fontSize: '0.9rem' }}>
            {SESSION_EXPIRED_MESSAGE}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                required
                {...field}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                required
                {...field}
              />
            )}
          />

          {submitError && (
            <p role="alert" className="login-error">
              {submitError}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={isSubmitting} style={{ width: '100%' }}>
            {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
          <p className="login-footer">
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </p>
          <p className="login-footer" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <PrivacyNoticeInlineLink />
          </p>
        </form>
      </Card>
    </div>
  );
}
