import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../lib/validations/loginSchema';
import { useAuthStore } from '../stores/authStore';
import { Button, Input, Card } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [submitError, setSubmitError] = useState('');

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
        <h1>Cuidate</h1>
        <p className="login-subtitle">Área de Doctores y Administradores</p>

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
        </form>
      </Card>
    </div>
  );
}
