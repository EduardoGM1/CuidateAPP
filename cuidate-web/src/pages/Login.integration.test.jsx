import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import Login from './Login';
import { STORAGE_KEYS } from '../utils/constants';
import { renderWithProviders } from '../test/test-utils';
import { server } from '../test/msw/server';

function renderLoginRoutes() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<main data-testid="post-login-home">Inicio</main>} />
    </Routes>,
    { initialEntries: ['/login'] }
  );
}

describe('Login (integración + MSW)', () => {
  it('envía credenciales, persiste token y navega al inicio', async () => {
    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('test-jwt-token');
    });
    expect(await screen.findByTestId('post-login-home')).toBeInTheDocument();
  });

  it('muestra mensaje de error ante 401 de la API', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
      )
    );
    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(screen.getByLabelText(/correo electrónico/i), 'x@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toMatch(/credenciales|error|inválid/i);
  });
});
